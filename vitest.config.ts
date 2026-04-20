import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    // Exclude Claude Code worktree copies — these are scratch sandboxes
    // created by the agent harness and contain stale test duplicates that
    // would pollute the suite. Also the standard build + deps excludes.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.claude/**',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
