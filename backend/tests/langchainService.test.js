import { describe, it, expect, vi } from 'vitest';

const SECRET = 'SECRET-INTERNAL-DETAIL';

// Mock the agent executor itself so runAssistant's real control flow (rate-limit
// retry, output sanitizing, proposed-action extraction, the final catch) all run for
// real — only the LLM round-trip is faked.
vi.mock('@langchain/classic/agents', () => ({
  createToolCallingAgent: vi.fn().mockResolvedValue({}),
  AgentExecutor: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockRejectedValue(new Error(SECRET))
  }))
}));

const { runAssistant } = await import('../utils/langchainService.js');

describe('runAssistant — never echoes the raw agent error to the user', () => {
  it('returns a safe message instead of the thrown error text', async () => {
    const result = await runAssistant({
      userId: '6ae2a43431ed6b7c38dc3a4f',
      question: 'What is my budget?',
      history: [],
      page: 'app'
    });

    expect(result.success).toBe(false);
    expect(result.message).not.toContain(SECRET);
  });
});
