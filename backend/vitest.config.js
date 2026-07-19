import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // mongodb-memory-server downloads its binary on first run — give it room.
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false
  }
});
