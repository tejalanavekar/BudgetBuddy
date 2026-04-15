import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import dotenv from 'dotenv';

dotenv.config();

const model = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7,
  apiKey: process.env.OPENAI_API_KEY
});

// ── Prompt Templates ────────────────────────────────────────────────

const budgetAnalysisTemplate = `You are a helpful budget advisor AI. Analyze the user's spending data and provide insights.

Current Data:
- Total Monthly Budget: {totalBudget}
- Current Spending: {currentSpending}
- Remaining Budget: {remainingBudget}
- Days Elapsed This Month: {daysElapsed}
- Days Remaining: {daysRemaining}
- Average Daily Spend: {avgDailySpend}
- Safe Daily Budget: {safeDailyBudget}

Expense Summary:
{expenseSummary}

Category-wise Budgets:
{categoryBudgets}

User Question: {question}

Provide a concise, helpful response with specific recommendations based on the data.`;

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

// ── Main Chat Function ────────────────────────────────────────────

export const budgetAIChat = async (userId, userQuestion, budgetData, expenseStats) => {
  try {
    // Format expense summary
    const expenseSummary = expenseStats.recentExpenses
      .map(e => `- ${e.category}: $${e.amount} (${e.description})`)
      .join('\n') || 'No recent expenses';

    // Format category budgets
    const categoryBudgetsText = budgetData.categoryBudgets
      .map(cb => `- ${cb.category}: $${cb.amount}`)
      .join('\n') || 'No category budgets set';

    // Format the prompt
    const prompt = budgetAnalysisTemplate
      .replace('{totalBudget}', `$${budgetData.totalMonthlyBudget}`)
      .replace('{currentSpending}', `$${expenseStats.currentSpending}`)
      .replace('{remainingBudget}', `$${expenseStats.remainingBudget}`)
      .replace('{daysElapsed}', expenseStats.daysElapsed)
      .replace('{daysRemaining}', expenseStats.daysRemaining)
      .replace('{avgDailySpend}', `$${expenseStats.avgDailySpend.toFixed(2)}`)
      .replace('{safeDailyBudget}', `$${expenseStats.safeDailyBudget.toFixed(2)}`)
      .replace('{expenseSummary}', expenseSummary)
      .replace('{categoryBudgets}', categoryBudgetsText)
      .replace('{question}', userQuestion);

    // Call the model
    const response = await model.invoke(prompt);

    return {
      success: true,
      message: response.content || response.text || response,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('LangChain Error:', error);
    return {
      success: false,
      message: `I encountered an issue: ${error.message}`,
      timestamp: new Date()
    };
  }
};

// ── Generate Budget Summary ────────────────────────────────────

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
    console.error('Summary Generation Error:', error);
    return {
      success: false,
      summary: 'Unable to generate summary at this time.'
    };
  }
};
