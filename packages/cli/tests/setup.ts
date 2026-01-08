/**
 * Test setup for @riktajs/cli
 */

import { vi } from 'vitest';

// Mock process.exit to prevent tests from exiting
vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined): never => {
  throw new Error(`process.exit called with code: ${code}`);
});

// Clean up temp directories after tests
afterAll(async () => {
  // Cleanup is handled in individual tests
});
