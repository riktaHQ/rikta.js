import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useNavigate } from '../src/hooks/useNavigate';
import { useParams } from '../src/hooks/useParams';
import { useLocation } from '../src/hooks/useLocation';
import { useSsrData } from '../src/hooks/useSsrData';
import { useHydration } from '../src/hooks/useHydration';
import { useSearchParams } from '../src/hooks/useSearchParams';
import { getSsrData, setSsrData, clearSsrDataCache } from '../src/utils/getSsrData';
import type { SsrData } from '../src/types';

// Helper component to test useNavigate hook
function TestNavigateHook() {
  const navigate = useNavigate();
  return (
    <div>
      <button data-testid="navigate-btn" onClick={() => navigate('/test')}>
        Navigate
      </button>
      <button data-testid="navigate-params-btn" onClick={() => navigate('/search', { q: 'hello', page: 1 })}>
        Navigate with params
      </button>
      <button data-testid="navigate-replace-btn" onClick={() => navigate('/login', { replace: true })}>
        Navigate replace
      </button>
    </div>
  );
}

function TestParamsHook() {
  const params = useParams<{ id: string; slug?: string }>();
  return (
    <div>
      <span data-testid="id">{params.id}</span>
      <span data-testid="slug">{params.slug ?? 'none'}</span>
    </div>
  );
}

function TestLocationHook() {
  const location = useLocation();
  return (
    <div>
      <span data-testid="pathname">{location.pathname}</span>
      <span data-testid="search">{location.search}</span>
      <span data-testid="href">{location.href}</span>
    </div>
  );
}

function TestSsrDataHook() {
  const ssrData = useSsrData<{ message: string }>();
  return (
    <div>
      <span data-testid="message">{ssrData?.data.message ?? 'no data'}</span>
      <span data-testid="url">{ssrData?.url ?? 'no url'}</span>
      <span data-testid="title">{ssrData?.title ?? 'no title'}</span>
      <span data-testid="description">{ssrData?.description ?? 'no description'}</span>
    </div>
  );
}

function TestHydrationHook() {
  const { isHydrated, isServer } = useHydration();
  return (
    <div>
      <span data-testid="hydrated">{isHydrated ? 'yes' : 'no'}</span>
      <span data-testid="server">{isServer ? 'yes' : 'no'}</span>
    </div>
  );
}

function TestSearchParamsHook() {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <div>
      <span data-testid="q">{searchParams.get('q') ?? 'none'}</span>
      <button data-testid="set-params-btn" onClick={() => setSearchParams({ q: 'test', page: 1 })}>
        Set Params
      </button>
    </div>
  );
}

describe('getSsrData utility', () => {
  beforeEach(() => {
    clearSsrDataCache();
  });

  afterEach(() => {
    clearSsrDataCache();
  });

  it('returns null when no SSR data', () => {
    expect(getSsrData()).toBeNull();
  });

  it('returns SSR data when set via setSsrData', () => {
    const ssrData: SsrData<{ message: string }> = {
      data: { message: 'Hello' },
      url: '/test',
    };
    setSsrData(ssrData);
    
    const result = getSsrData<{ message: string }>();
    expect(result?.data.message).toBe('Hello');
    expect(result?.url).toBe('/test');
  });

  it('caches SSR data after first read', () => {
    const ssrData: SsrData = { data: { test: true }, url: '/' };
    setSsrData(ssrData);
    
    const result1 = getSsrData();
    const result2 = getSsrData();
    
    expect(result1).toBe(result2);
  });

  it('clearSsrDataCache clears the cache', () => {
    setSsrData({ data: { test: true }, url: '/' });
    expect(getSsrData()).not.toBeNull();
    
    clearSsrDataCache();
    expect(getSsrData()).toBeNull();
  });
});

describe('useNavigate', () => {
  let mockLocationHref: string;
  let mockLocationReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLocationHref = '/';
    mockLocationReplace = vi.fn();
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        get href() { return mockLocationHref; },
        set href(value: string) { mockLocationHref = value; },
        origin: 'http://localhost',
        pathname: '/',
        search: '',
        replace: mockLocationReplace,
      },
      writable: true,
    });
  });

  it('returns a navigate function', () => {
    render(<TestNavigateHook />);
    expect(screen.getByTestId('navigate-btn')).toBeInTheDocument();
  });
});

describe('useParams', () => {
  beforeEach(() => {
    clearSsrDataCache();
  });

  afterEach(() => {
    clearSsrDataCache();
  });

  it('returns empty params when no SSR data', () => {
    render(<TestParamsHook />);

    expect(screen.getByTestId('id')).toHaveTextContent('');
    expect(screen.getByTestId('slug')).toHaveTextContent('none');
  });

  it('returns params from SSR data meta', () => {
    setSsrData({
      data: { page: 'item' },
      url: '/item/456',
      meta: {
        params: { id: '456', slug: 'test-item' },
      },
    });

    render(<TestParamsHook />);

    expect(screen.getByTestId('id')).toHaveTextContent('456');
    expect(screen.getByTestId('slug')).toHaveTextContent('test-item');
  });
});

describe('useLocation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost/test?foo=bar',
        origin: 'http://localhost',
        pathname: '/test',
        search: '?foo=bar',
      },
      writable: true,
    });
  });

  it('returns location information from window.location', () => {
    render(<TestLocationHook />);

    expect(screen.getByTestId('pathname')).toHaveTextContent('/test');
    expect(screen.getByTestId('search')).toHaveTextContent('foo=bar');
  });
});

describe('useSsrData', () => {
  beforeEach(() => {
    clearSsrDataCache();
  });

  afterEach(() => {
    clearSsrDataCache();
  });

  it('returns null when no SSR data', () => {
    render(<TestSsrDataHook />);
    expect(screen.getByTestId('message')).toHaveTextContent('no data');
  });

  it('returns SSR data when set', () => {
    setSsrData({
      data: { message: 'Server rendered' },
      url: '/ssr-page',
    });

    render(<TestSsrDataHook />);

    expect(screen.getByTestId('message')).toHaveTextContent('Server rendered');
    expect(screen.getByTestId('url')).toHaveTextContent('/ssr-page');
  });

  it('returns title and description when provided', () => {
    setSsrData({
      data: { message: 'Page content' },
      url: '/page',
      title: 'Page Title',
      description: 'Page description for SEO',
    });

    render(<TestSsrDataHook />);

    expect(screen.getByTestId('title')).toHaveTextContent('Page Title');
    expect(screen.getByTestId('description')).toHaveTextContent('Page description for SEO');
  });
});

describe('useHydration', () => {
  it('reports not server in browser environment', () => {
    render(<TestHydrationHook />);
    expect(screen.getByTestId('server')).toHaveTextContent('no');
  });
});

describe('useSearchParams', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost/search?q=hello&page=2',
        origin: 'http://localhost',
        pathname: '/search',
        search: '?q=hello&page=2',
      },
      writable: true,
    });
  });

  it('returns current search params', () => {
    render(<TestSearchParamsHook />);
    expect(screen.getByTestId('q')).toHaveTextContent('hello');
  });
});
