import { ChatGroq } from '@langchain/groq';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { tool } from '@langchain/core/tools';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { z } from 'zod';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Budget from '../models/Budget.js';
import Subscription from '../models/Subscription.js';
import Expense from '../models/Expense.js';
import { calculateDailySpentStats, calculateSafeDailyBudget, getCategoryBudgetStatus } from './budgetAnalytics.js';
import logger from './logger.js';

dotenv.config();

const getCurrentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Groq/Llama tool-calling sometimes sends the literal value/string "null" as the whole
// argument payload when a tool needs no parameters, instead of {} — normalize that away
// before zod sees it, since z.object() otherwise rejects anything that isn't a plain object.
const nullSafeObject = (shape) => z.preprocess(
  (val) => (val === null || val === undefined || val === 'null' ? {} : val),
  z.object(shape)
);

// Safety net: some Llama tool-calling responses leak the raw call syntax into the
// final answer text instead of actually invoking it — strip that out before it reaches the user.
const sanitizeOutput = (text) => {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<function=[^>]*>[\s\S]*?<\/function>/g, '')
    .replace(/<function[^>]*\/?>/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
};

const model = new ChatGroq({
  model: 'llama-3.3-70b-versatile',
  temperature: 0.4,
  apiKey: process.env.GROQ_API_KEY,
  maxRetries: 2, // default (6) silently retries with backoff on rate limits/network
  // hiccups, which can stack up 20-30s before you ever see an error — fail faster instead.
  timeout: 20000 // per-call cap, so one stuck call can't eat the whole request budget
});

// ── Tools ──────────────────────────────────────────────────────────
// Each tool is bound to one user's ObjectId at request time, so the LLM never
// sees or supplies userId itself — it can only ever query the current user's data.
const buildTools = (userIdObj) => {
  const getBudgetStatus = tool(
    async ({ monthYear }) => {
      const targetMonthYear = monthYear || getCurrentMonthYear();
      const budget = await Budget.findOne({ userId: userIdObj, monthYear: targetMonthYear });

      if (!budget) {
        return JSON.stringify({
          found: false,
          monthYear: targetMonthYear,
          message: `No budget has been set for ${targetMonthYear}.`
        });
      }

      const stats = await calculateDailySpentStats(userIdObj, targetMonthYear);
      const safeDailyBudget = calculateSafeDailyBudget(budget.totalMonthlyBudget, stats.currentSpending, stats.daysRemaining);
      const categoryBudgetStatus = getCategoryBudgetStatus(
        budget.categoryBudgets,
        stats.categoryBreakdown.reduce((acc, c) => { acc[c.category] = c.total; return acc; }, {})
      );

      return JSON.stringify({
        found: true,
        monthYear: targetMonthYear,
        totalBudget: budget.totalMonthlyBudget,
        currentSpending: stats.currentSpending,
        remainingBudget: Number((budget.totalMonthlyBudget - stats.currentSpending).toFixed(2)),
        percentageSpent: Number(((stats.currentSpending / budget.totalMonthlyBudget) * 100).toFixed(1)),
        daysElapsed: stats.daysElapsed,
        daysRemaining: stats.daysRemaining,
        avgDailySpend: stats.avgDailySpend,
        safeDailyBudget,
        categoryBudgetStatus
      });
    },
    {
      name: 'get_budget_status',
      description: "Look up the user's monthly budget vs actual spending — total budget, remaining budget, percentage spent, safe daily spend, and per-category budget status. Defaults to the current month if monthYear is omitted.",
      schema: nullSafeObject({
        monthYear: z.string().nullish().describe('Month in YYYY-MM format, e.g. "2026-07". Omit for the current month.')
      })
    }
  );

  const getSubscriptions = tool(
    async ({ status }) => {
      const validStatuses = ['Active', 'Paused', 'Cancelled'];
      const normalizedStatus = validStatuses.find(s => s.toLowerCase() === (status || '').toLowerCase());

      const filter = { userId: userIdObj };
      if (normalizedStatus) filter.status = normalizedStatus;

      const subs = await Subscription.find(filter).sort({ cost: -1 });
      const activeMonthlyTotal = subs
        .filter(s => s.status === 'Active')
        .reduce((sum, s) => sum + (s.billingCycle === 'Annual' ? s.cost / 12 : s.cost), 0);

      return JSON.stringify({
        count: subs.length,
        activeMonthlyTotal: Number(activeMonthlyTotal.toFixed(2)),
        subscriptions: subs.map(s => ({
          name: s.name,
          cost: s.cost,
          billingCycle: s.billingCycle,
          category: s.category,
          status: s.status,
          nextBillingDate: s.nextBillingDate
        }))
      });
    },
    {
      name: 'get_subscriptions',
      description: "Look up the user's subscriptions — name, cost, billing cycle, category, status, and next billing date. Optionally filter by status.",
      schema: nullSafeObject({
        status: z.string().nullish().describe('Filter by status: "Active", "Paused", or "Cancelled". Omit for everything.')
      })
    }
  );

  // Deliberately read-only — it looks up the subscription and hands back what a
  // status change *would* look like, but never writes anything. The LLM can call this
  // as many times, and as early, as it wants: there's no unsafe outcome possible, because
  // the actual mutation only ever happens from a real button click in the UI, via the
  // existing PUT /api/subscriptions/:id endpoint — never from this tool or the agent loop.
  const proposeSubscriptionAction = tool(
    async ({ subscriptionName, subscriptionId, newStatus }) => {
      const validStatuses = ['Active', 'Paused', 'Cancelled'];
      const normalizedStatus = validStatuses.find(s => s.toLowerCase() === (newStatus || '').toLowerCase());
      if (!normalizedStatus) {
        return JSON.stringify({ found: false, message: `"${newStatus}" is not a valid status. Use Active, Paused, or Cancelled.` });
      }

      // Second call, after disambiguating a multi-match by id — go straight there, skip name search.
      if (subscriptionId) {
        const sub = await Subscription.findOne({ _id: subscriptionId, userId: userIdObj });
        if (!sub) {
          return JSON.stringify({ found: false, message: `Couldn't find that subscription.` });
        }
        return JSON.stringify({
          found: true,
          subscriptionId: sub._id.toString(),
          name: sub.name,
          currentStatus: sub.status,
          proposedStatus: normalizedStatus
        });
      }

      const escapedName = subscriptionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matches = await Subscription.find({
        userId: userIdObj,
        name: { $regex: new RegExp(`^${escapedName}$`, 'i') }
      }).sort({ nextBillingDate: 1 });

      if (matches.length === 0) {
        return JSON.stringify({ found: false, message: `No subscription named "${subscriptionName}" was found.` });
      }

      if (matches.length > 1) {
        return JSON.stringify({
          found: true,
          multiple: true,
          message: `There are ${matches.length} subscriptions named "${subscriptionName}". Pick the one matching the user's criteria (e.g. earliest/latest billing date, cost, status) from "matches", then call this tool again with that subscriptionId. If the user didn't give enough info to choose, ask them instead of guessing.`,
          matches: matches.map(s => ({
            subscriptionId: s._id.toString(),
            name: s.name,
            status: s.status,
            cost: s.cost,
            billingCycle: s.billingCycle,
            nextBillingDate: s.nextBillingDate
          }))
        });
      }

      const sub = matches[0];
      return JSON.stringify({
        found: true,
        subscriptionId: sub._id.toString(),
        name: sub.name,
        currentStatus: sub.status,
        proposedStatus: normalizedStatus
      });
    },
    {
      name: 'propose_subscription_action',
      description: "Look up a subscription to prepare a status change (Active/Paused/Cancelled). This does NOT change anything — it only fetches the details needed for the user to confirm via a button. If multiple subscriptions share the same name, it returns a list to disambiguate from instead of guessing — call it again with the chosen subscriptionId. Always safe to call.",
      schema: nullSafeObject({
        subscriptionName: z.string().nullish().describe('The exact name of the subscription, e.g. "Netflix". Omit if you already have a subscriptionId from a previous disambiguation.'),
        subscriptionId: z.string().nullish().describe('The specific subscription\'s id, once known — e.g. after resolving which of several same-named subscriptions the user means.'),
        newStatus: z.string().describe('The status to propose: "Active", "Paused", or "Cancelled".')
      })
    }
  );

  // Read-only, same as the subscription one — figures out what would change and hands
  // that back for a confirm button. Preserves any existing category budgets the user
  // hasn't mentioned, rather than silently wiping them.
  const proposeBudgetUpdate = tool(
    async ({ monthYear, totalMonthlyBudget, categoryBudgets }) => {
      const targetMonthYear = monthYear || getCurrentMonthYear();
      const amount = Number(totalMonthlyBudget);

      if (!Number.isFinite(amount) || amount < 0) {
        return JSON.stringify({ found: false, message: 'A valid, non-negative total budget amount is required.' });
      }

      const existing = await Budget.findOne({ userId: userIdObj, monthYear: targetMonthYear });
      const resolvedCategoryBudgets = (categoryBudgets && categoryBudgets.length > 0)
        ? categoryBudgets.map(c => ({ category: c.category, amount: Number(c.amount) }))
        : (existing?.categoryBudgets || []);

      return JSON.stringify({
        found: true,
        monthYear: targetMonthYear,
        isUpdate: !!existing,
        previousTotal: existing ? existing.totalMonthlyBudget : null,
        totalMonthlyBudget: amount,
        categoryBudgets: resolvedCategoryBudgets
      });
    },
    {
      name: 'propose_budget_update',
      description: "Prepare setting or updating the user's total monthly budget (and optionally category-specific budgets) for a given month. This does NOT save anything — it only validates and returns a proposal for the user to confirm via a button.",
      schema: nullSafeObject({
        monthYear: z.string().nullish().describe('Month in YYYY-MM format, e.g. "2026-08". Omit for the current month.'),
        totalMonthlyBudget: z.coerce.number().describe('The total monthly budget amount, e.g. 600.'),
        categoryBudgets: z.array(z.object({
          category: z.string(),
          amount: z.coerce.number()
        })).nullish().describe('Optional per-category budget amounts, e.g. [{"category":"Food","amount":150}]. Omit if the user hasn\'t given any yet or wants to skip — existing category budgets for that month are kept as-is.')
      })
    }
  );

  const getRecentExpenses = tool(
    async ({ category, limit }) => {
      const filter = { userId: userIdObj };
      if (category && category !== 'All') filter.category = category;
      const cap = Math.min(limit || 10, 30);

      const expenses = await Expense.find(filter).sort({ date: -1 }).limit(cap);

      return JSON.stringify({
        count: expenses.length,
        expenses: expenses.map(e => ({
          description: e.description,
          amount: e.amount,
          category: e.category,
          date: e.date
        }))
      });
    },
    {
      name: 'get_recent_expenses',
      description: "Look up the user's most recent individual expenses, optionally filtered by category. Useful for questions about specific purchases or category spending.",
      schema: nullSafeObject({
        category: z.string().nullish().describe('Expense category to filter by, e.g. "Food". Omit for all categories.'),
        limit: z.coerce.number().nullish().describe('Max number of expenses to return (default 10, max 30).')
      })
    }
  );

  return [getBudgetStatus, getSubscriptions, proposeSubscriptionAction, proposeBudgetUpdate, getRecentExpenses];
};

// ── Prompt ─────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Budget Buddy's AI financial assistant.

You help users understand their budget, expenses, and subscriptions, and offer general money-management tips.

Rules:
- Only state numbers that came from a tool call — never invent or estimate figures.
- If a tool reports no data (e.g. no budget set for a month), tell the user plainly and suggest what to do next.
- Give thorough, well-explained answers — walk through the relevant numbers (totals, per-category breakdowns, trends, comparisons) rather than compressing everything into one or two lines. Use short paragraphs or bullet points when that makes the breakdown easier to follow.
- Use $ formatting for money.
- End with one or more concrete, actionable suggestions grounded in the actual numbers.
- If asked something unrelated to budgeting, expenses, subscriptions, or personal finance, politely decline and steer the conversation back on topic.
- Never write out tool/function-call syntax (e.g. "<function=...>", raw JSON arguments) as part of your answer. If you need more data, call the tool itself — don't describe or fake the call in text.
- The user is currently on the "{page}" page — use that only as light context, it does not limit what you can answer.

What you can and can't do:
- You can change an EXISTING subscription's status (Active/Paused/Cancelled) via propose_subscription_action, and set/update a month's total (and category) budget via propose_budget_update. You cannot create, add, or delete anything else — no new subscriptions or expenses, and no deleting anything.
- If asked to do something outside that (e.g. "add a subscription", "log an expense", "delete this"), say plainly that you can't do that from chat yet, and point them to the right place in the app instead: "+ Add Subscription" on the Subscriptions page, or "+ Add Expense" on the Expense page. Never call a propose_* tool for a request like this — those only ever propose the two specific changes above.

Taking action (propose_subscription_action):
- When the user wants to pause, cancel, or reactivate an EXISTING subscription, call propose_subscription_action with the subscription name and desired status — this is always safe to call, it only looks up details and changes nothing.
- If the result has "multiple": true, there's more than one subscription with that name — do NOT guess. Look at the "matches" list and the user's own wording (earliest/latest billing date, cost, current status, etc.) to pick the right one, then call propose_subscription_action again passing that match's subscriptionId (and the same newStatus) to get a concrete proposal. If the user's request doesn't give you enough to tell them apart, ask a clarifying question instead of picking one.
- After getting a concrete (non-multiple) result, briefly acknowledge what you found in one sentence (e.g. "Here's the change for Netflix (renews Jul 19) — I've put a confirm button below."), mentioning the distinguishing detail (like billing date) if there were multiple matches. Do not claim the change has already been made — a confirm button will be shown to the user separately; you are not the one applying it.
- If the tool reports the subscription wasn't found, say so and ask the user to check the name.

Taking action (propose_budget_update):
- When the user wants to set or update their total monthly budget (e.g. "set my budget to $600 for August"), call propose_budget_update with that amount and month (default to the current month if they didn't say one).
- Right after proposing, if the user hasn't already mentioned category-specific budgets, ask them in the same reply: "Want to set budgets for specific categories too (like Food or Transport), or should I skip that?" Do not call the tool again yet — wait for their answer.
- If they give you category amounts, call propose_budget_update again with the same totalMonthlyBudget/monthYear plus categoryBudgets filled in, so the confirm button reflects the full picture.
- If they say skip/no, don't call it again — the existing proposal already preserves any category budgets that were already set for that month, so nothing is lost by skipping.
- Never claim the budget has been saved — a confirm button will be shown to the user separately; you are not the one applying it.`;

const prompt = ChatPromptTemplate.fromMessages([
  ['system', SYSTEM_PROMPT],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
  new MessagesPlaceholder('agent_scratchpad')
]);

// ── Main entry point ───────────────────────────────────────────────
// history: array of { role: 'user' | 'assistant', content: string } — the last few
// turns from the frontend, so follow-up questions ("what about last month?") work.
export const runAssistant = async ({ userId, question, history = [], page = 'app' }) => {
  const startedAt = Date.now();
  try {
    const userIdObj = new mongoose.Types.ObjectId(userId);
    const tools = buildTools(userIdObj);

    const agent = await createToolCallingAgent({ llm: model, tools, prompt });
    const executor = new AgentExecutor({ agent, tools, returnIntermediateSteps: true });

    const chatHistory = history.slice(-8).map(m =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    const result = await executor.invoke({ input: question, chat_history: chatHistory, page });
    logger.info(`[assistant] "${question.slice(0, 60)}" took ${Date.now() - startedAt}ms, ${(result.intermediateSteps || []).length} tool call(s)`);

    const toolsUsed = (result.intermediateSteps || [])
      .map(step => step.action?.tool)
      .filter(Boolean);

    // Pull out the last successful propose_* call, if any, so the frontend can render a
    // real confirm button — the actual write happens from that button (via the existing
    // subscription/budget update endpoints), never from this call.
    const PROPOSAL_TOOL_TYPES = {
      propose_subscription_action: 'subscription_status',
      propose_budget_update: 'budget_update'
    };
    let proposedAction = null;
    for (const step of result.intermediateSteps || []) {
      const type = PROPOSAL_TOOL_TYPES[step.action?.tool];
      if (!type) continue;
      try {
        const parsed = JSON.parse(step.observation);
        // Only a concrete, single-match result is confirm-button-ready —
        // a "multiple matches" result is the model's own disambiguation step, not a proposal.
        if (parsed.found && !parsed.multiple) proposedAction = { type, ...parsed };
      } catch {
        // malformed observation — ignore, no proposal surfaced
      }
    }

    return { success: true, message: sanitizeOutput(result.output), toolsUsed, proposedAction };
  } catch (error) {
    logger.error(`[assistant] failed after ${Date.now() - startedAt}ms:`, error);
    return { success: false, message: `I ran into an issue: ${error.message}`, toolsUsed: [] };
  }
};

// ── Budget Summary (unchanged — still used by the "Summary" quick action) ──
const budgetSummaryTemplate = `You are a budget summary expert. Create a brief, actionable summary of the user's financial status.

Financial Data:
- Monthly Budget: {totalBudget}
- Current Spending: {currentSpending}
- Remaining: {remainingBudget} ({percentageSpent}% spent)
- Daily Average: {avgDailySpend}
- Safe Daily Budget: {safeDailyBudget}
- Days Remaining: {daysRemaining}

Top Spending Categories:
{topCategories}

Provide a 2-3 sentence summary with key actionable insights.`;

export const generateBudgetSummary = async (userId, budgetData, expenseStats) => {
  try {
    const topCategories = expenseStats.categoryBreakdown
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(c => `- ${c.category}: $${c.total}`)
      .join('\n') || 'No category data';

    const percentageSpent = ((expenseStats.currentSpending / budgetData.totalMonthlyBudget) * 100).toFixed(1);

    const prompt = budgetSummaryTemplate
      .replace('{totalBudget}', `$${budgetData.totalMonthlyBudget}`)
      .replace('{currentSpending}', `$${expenseStats.currentSpending}`)
      .replace('{remainingBudget}', `$${expenseStats.remainingBudget}`)
      .replace('{percentageSpent}', percentageSpent)
      .replace('{avgDailySpend}', `$${expenseStats.avgDailySpend.toFixed(2)}`)
      .replace('{safeDailyBudget}', `$${expenseStats.safeDailyBudget.toFixed(2)}`)
      .replace('{daysRemaining}', expenseStats.daysRemaining)
      .replace('{topCategories}', topCategories);

    const response = await model.invoke(prompt);

    return {
      success: true,
      summary: response.content || response.text || response
    };
  } catch (error) {
    logger.error('Summary Generation Error:', error);
    return {
      success: false,
      summary: 'Unable to generate summary at this time.'
    };
  }
};
