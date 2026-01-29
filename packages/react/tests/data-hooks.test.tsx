import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFetch } from '../src/hooks/useFetch';
import { useAction } from '../src/hooks/useAction';

describe('useFetch', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useFetch<typeof mockData>('/api/test'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
  });

  it('handles fetch error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useFetch('/api/not-found'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe('HTTP 404: Not Found');
  });

  it('skips fetch when skip option is true', async () => {
    global.fetch = vi.fn();

    const { result } = renderHook(() => useFetch('/api/test', { skip: true }));

    // Should not be loading and should not fetch
    expect(result.current.loading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useAction', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('executes action successfully', async () => {
    const mockResponse = { id: 1, name: 'Created Item' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() =>
      useAction<{ name: string }, typeof mockResponse>('/api/items')
    );

    expect(result.current.pending).toBe(false);
    expect(result.current.result).toBe(null);

    await act(async () => {
      await result.current.execute({ name: 'New Item' });
    });

    expect(result.current.pending).toBe(false);
    expect(result.current.result?.success).toBe(true);
    expect(result.current.result?.data).toEqual(mockResponse);
  });

  it('handles action error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Validation failed' }),
    });

    const { result } = renderHook(() => useAction('/api/items'));

    await act(async () => {
      await result.current.execute({ name: '' });
    });

    expect(result.current.result?.success).toBe(false);
    expect(result.current.result?.error).toBe('Validation failed');
  });

  it('resets result when reset is called', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1 }),
    });

    const { result } = renderHook(() => useAction('/api/items'));

    await act(async () => {
      await result.current.execute({});
    });

    expect(result.current.result).not.toBe(null);

    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBe(null);
  });
});
