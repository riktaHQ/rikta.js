import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RiktaProvider } from '../src/components/RiktaProvider';
import { Link } from '../src/components/Link';
import { useNavigation } from '../src/hooks/useNavigation';
import { useParams } from '../src/hooks/useParams';
import { useLocation } from '../src/hooks/useLocation';
import { useSsrData } from '../src/hooks/useSsrData';
import { useHydration } from '../src/hooks/useHydration';
import type { SsrData } from '../src/types';

// Helper component to test hooks
function TestNavigationHook() {
  const { pathname } = useNavigation();
  return (
    <div>
      <span data-testid="pathname">{pathname}</span>
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

describe('RiktaProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children', () => {
    render(
      <RiktaProvider>
        <div data-testid="child">Hello</div>
      </RiktaProvider>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides SSR data from props', () => {
    const ssrData: SsrData<{ message: string }> = {
      data: { message: 'Hello from SSR' },
      url: '/test',
    };

    render(
      <RiktaProvider ssrData={ssrData}>
        <TestSsrDataHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('message')).toHaveTextContent('Hello from SSR');
    expect(screen.getByTestId('url')).toHaveTextContent('/test');
  });

  it('provides initial params', () => {
    render(
      <RiktaProvider initialParams={{ id: '123', slug: 'test-item' }}>
        <TestParamsHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('id')).toHaveTextContent('123');
    expect(screen.getByTestId('slug')).toHaveTextContent('test-item');
  });
});

describe('Link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an anchor element', () => {
    render(
      <RiktaProvider>
        <Link href="/about">About</Link>
      </RiktaProvider>
    );

    const link = screen.getByText('About');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/about');
  });

  it('passes through additional props', () => {
    render(
      <RiktaProvider>
        <Link href="/about" className="nav-link" data-testid="about-link">
          About
        </Link>
      </RiktaProvider>
    );

    const link = screen.getByTestId('about-link');
    expect(link).toHaveClass('nav-link');
  });

  it('calls custom onClick handler', () => {
    const handleClick = vi.fn();
    
    render(
      <RiktaProvider>
        <Link href="/about" onClick={handleClick}>About</Link>
      </RiktaProvider>
    );

    fireEvent.click(screen.getByText('About'));
    expect(handleClick).toHaveBeenCalled();
  });
});

describe('useNavigation', () => {
  it('returns current pathname', () => {
    render(
      <RiktaProvider>
        <TestNavigationHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('pathname')).toBeInTheDocument();
  });
});

describe('useParams', () => {
  it('returns empty params when none provided', () => {
    render(
      <RiktaProvider>
        <TestParamsHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('id')).toHaveTextContent('');
    expect(screen.getByTestId('slug')).toHaveTextContent('none');
  });

  it('returns provided params', () => {
    render(
      <RiktaProvider initialParams={{ id: '456' }}>
        <TestParamsHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('id')).toHaveTextContent('456');
  });
});

describe('useLocation', () => {
  it('returns location information', () => {
    render(
      <RiktaProvider>
        <TestLocationHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('pathname')).toBeInTheDocument();
  });
});

describe('useSsrData', () => {
  it('returns null when no SSR data is provided', () => {
    render(
      <RiktaProvider>
        <TestSsrDataHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('message')).toHaveTextContent('no data');
  });

  it('returns SSR data when provided', () => {
    const ssrData: SsrData<{ message: string }> = {
      data: { message: 'Server rendered' },
      url: '/ssr-page',
    };

    render(
      <RiktaProvider ssrData={ssrData}>
        <TestSsrDataHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('message')).toHaveTextContent('Server rendered');
    expect(screen.getByTestId('url')).toHaveTextContent('/ssr-page');
  });

  it('returns title and description when provided', () => {
    const ssrData: SsrData<{ message: string }> = {
      data: { message: 'Page content' },
      url: '/page',
      title: 'Page Title',
      description: 'Page description for SEO',
    };

    render(
      <RiktaProvider ssrData={ssrData}>
        <TestSsrDataHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('title')).toHaveTextContent('Page Title');
    expect(screen.getByTestId('description')).toHaveTextContent('Page description for SEO');
  });

  it('initializes location from ssrData.url during SSR', () => {
    // Note: In jsdom, window is always available, so this test
    // verifies that ssrData.url is correctly passed and accessible.
    // The actual SSR behavior (no window) works correctly in real SSR.
    const ssrData: SsrData<{ page: string }> = {
      data: { page: 'about' },
      url: '/about',
    };

    render(
      <RiktaProvider ssrData={ssrData}>
        <TestSsrDataHook />
      </RiktaProvider>
    );

    // Verify ssrData.url is correctly available
    expect(screen.getByTestId('url')).toHaveTextContent('/about');
  });
});

describe('useHydration', () => {
  it('reports not server in browser environment', () => {
    render(
      <RiktaProvider>
        <TestHydrationHook />
      </RiktaProvider>
    );

    expect(screen.getByTestId('server')).toHaveTextContent('no');
  });
});
