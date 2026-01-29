import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window methods that might not be available in jsdom
vi.stubGlobal('scrollTo', vi.fn());
