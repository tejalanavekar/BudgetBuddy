import axiosInstance from '../axiosInstance';

const AI_API = '/ai';

/**
 * Chat with the Budget Buddy assistant — covers budget, expenses, subscriptions,
 * and general money-management tips (not just budget, unlike the old endpoint).
 * history: last few { role: 'user'|'assistant', content } turns, for follow-up context.
 * page: friendly label of the page the user is currently on (light context for the LLM).
 */
export const chatWithAssistant = async (userId, question, history = [], page = 'app') => {
  try {
    // Longer timeout than the axios default (10s) — the agent can take multiple
    // tool-call round-trips (e.g. disambiguating duplicate subscriptions) plus LLM latency.
    const response = await axiosInstance.post(`${AI_API}/${userId}/chat`, { question, history, page }, { timeout: 30000 });
    return response.data;
  } catch (error) {
    console.error('Error chatting with assistant:', error);
    throw error;
  }
};
