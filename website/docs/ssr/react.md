---
title: React Integration
sidebar_label: React
description: Build server-rendered React applications with @riktajs/react
---

# React SSR Integration

The `@riktajs/react` package provides React-specific hooks and utilities for building SSR applications with Rikta. It embraces the web platform by using **native browser APIs** for navigation and **no Provider wrapper** needed.

## Philosophy

- **No Provider needed** - Access SSR data directly via `getSsrData()`
- **Native navigation** - Use `<a href="...">` tags and `useNavigate()` (uses `window.location`)
- **Full page loads** - SSR data is always fresh, no complex state management

## Installation

```bash
npm install @riktajs/react react react-dom
npm install -D @vitejs/plugin-react @types/react @types/react-dom
```

## Setup

### 1. Vite Configuration

```typescript title="vite.config.ts"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        client: './index.html',
      },
    },
  },
});
```

### 2. Entry Files

**Server Entry:**

```tsx title="src/entry-server.tsx"
import React from 'react';
import { renderToString } from 'react-dom/server';
import { setSsrData, type SsrData } from '@riktajs/react';
import { App } from './App';
import { HeadBuilder } from '@riktajs/ssr';

export function render(url: string, context: Record<string, unknown> = {}) {
  const { title: contextTitle, description: contextDescription, __SSR_DATA__, ...restContext } = context;
  
  // Create SSR data structure
  const ssrData: SsrData = {
    data: __SSR_DATA__ ?? restContext,
    url,
    title: contextTitle as string | undefined,
    description: contextDescription as string | undefined,
  };

  // Set SSR data for server-side rendering
  setSsrData(ssrData);

  // Render React app - no provider needed!
  const html = renderToString(<App />);

  // Build head tags
  const head = new HeadBuilder();
  head.title(contextTitle as string || 'My App');
  
  if (contextDescription) {
    head.description(contextDescription as string);
  }
  
  // Add SSR data for client hydration
  head.withSsrData(ssrData as unknown as Record<string, unknown>);
  
  return {
    html,
    title: head.getTitle(),
    head: head.build(),
  };
}
```

**Client Entry:**

```tsx title="src/entry-client.tsx"
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

// No provider needed! SSR data is read directly from window.__SSR_DATA__
const container = document.getElementById('app');

if (container) {
  hydrateRoot(container, <App />);
}
```

### 3. App Component

```tsx title="src/App.tsx"
import React from 'react';
import { getSsrData, useLocation } from '@riktajs/react';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';

interface SsrDataType {
  page?: string;
  [key: string]: unknown;
}

export function App() {
  const ssrData = getSsrData<SsrDataType>();
  const { search } = useLocation();
  
  const title = ssrData?.title || 'Rikta SSR + React';
  const ssrUrl = ssrData?.url ?? '/';
  const pathname = ssrUrl.split('?')[0];
  const url = search ? `${pathname}?${search}` : pathname;

  const renderPage = () => {
    if (pathname === '/about') return <AboutPage />;
    return <HomePage />;
  };

  return (
    <Layout url={url} title={title}>
      {renderPage()}
    </Layout>
  );
}
```

## Utils

### `getSsrData()`

Pure function to read SSR data from `window.__SSR_DATA__`:

```tsx
import { getSsrData } from '@riktajs/react';

interface PageData {
  page: string;
  items: Array<{ id: string; name: string }>;
}

function ItemList() {
  const ssrData = getSsrData<PageData>();
  
  if (!ssrData) return <div>Loading...</div>;
  
  const { data, title, url } = ssrData;
  
  return (
    <div>
      <h1>{title}</h1>
      <p>Current URL: {url}</p>
      <ul>
        {data.items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**SsrData Structure:**
```typescript
{
  data: T,              // Your page data
  url: string,          // Current URL
  title?: string,       // Page title from @Ssr decorator
  description?: string, // Page description from @Ssr decorator
}
```

### `setSsrData()` / `clearSsrDataCache()`

For testing or server-side rendering:

```tsx
import { setSsrData, clearSsrDataCache } from '@riktajs/react';

// Set SSR data manually (useful for testing)
setSsrData({ data: { user: { name: 'Test' } }, url: '/profile' });

// Clear the cache
clearSsrDataCache();
```

## Navigation

### Using Native Links

Use standard HTML anchor tags for navigation:

```tsx
function Navigation() {
  return (
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/item/123">Item 123</a>
    </nav>
  );
}
```

### Programmatic Navigation with `useNavigate()`

For programmatic navigation, use the `useNavigate()` hook:

```tsx
import { useNavigate } from '@riktajs/react';

function MyComponent() {
  const navigate = useNavigate();

  const handleSubmit = async () => {
    await saveData();
    navigate('/success');
  };

  const handleSearch = (query: string) => {
    // Navigation with query params - easy!
    navigate('/search', { q: query, page: 1 });
    // Results in: /search?q=query&page=1
  };

  const handleLogin = () => {
    // Replace history entry (for redirects)
    navigate('/dashboard', { replace: true });
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

## Hooks

### `useSsrData()`

Hook wrapper around `getSsrData()` for familiarity:

```tsx
import { useSsrData } from '@riktajs/react';

interface PageData {
  page: string;
  items: Array<{ id: string; name: string }>;
}

function ItemList() {
  const ssrData = useSsrData<PageData>();
  
  if (!ssrData) return <div>Loading...</div>;
  
  return (
    <ul>
      {ssrData.data.items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### `useNavigate()`

Programmatic navigation using native browser APIs:

```tsx
import { useNavigate } from '@riktajs/react';

function MyComponent() {
  const navigate = useNavigate();

  // Simple navigation
  navigate('/dashboard');

  // With query params
  navigate('/search', { q: 'hello', page: 1 });
  // Results in: /search?q=hello&page=1

  // Replace history (no back button)
  navigate('/login', { replace: true });

  // Params + options
  navigate('/items', { filter: 'active' }, { replace: true });
}
```

### `useLocation()`

Get current location information:

```tsx
import { useLocation } from '@riktajs/react';

function Breadcrumbs() {
  const { pathname, search, searchParams } = useLocation();
  
  return (
    <nav>
      Current path: {pathname}
      {search && <span>?{search}</span>}
    </nav>
  );
}
```

### `useParams()`

Access route parameters:

```tsx
import { useParams } from '@riktajs/react';

// For route /item/:id
function ItemPage() {
  const { id } = useParams<{ id: string }>();
  
  return <h1>Item {id}</h1>;
}
```

### `useSearchParams()`

Access and manipulate URL search parameters:

```tsx
import { useSearchParams } from '@riktajs/react';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery, page: '1' });
  };

  const handleNextPage = () => {
    setSearchParams({ q: query, page: String(page + 1) });
  };

  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => handleSearch(e.target.value)} 
      />
      <p>Page {page}</p>
      <button onClick={handleNextPage}>Next Page</button>
    </div>
  );
}
```

### `useFetch()`

Data fetching with loading/error states:

```tsx
import { useFetch } from '@riktajs/react';

interface User {
  id: string;
  name: string;
}

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error, refetch } = useFetch<User>(
    `/api/users/${userId}`
  );
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  if (!data) return null;
  
  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

**Options:**
```tsx
const { data } = useFetch<Item[]>('/api/items', {
  skip: true,           // Skip initial fetch
  deps: [token],        // Refetch when dependencies change
  headers: { 'Authorization': `Bearer ${token}` },
  transform: (res) => res.results, // Transform response
});
```

### `useAction()`

Execute server actions (mutations):

```tsx
import { useAction } from '@riktajs/react';

interface CreateItemInput {
  name: string;
  price: number;
}

function CreateItemForm() {
  const { execute, pending, result } = useAction<CreateItemInput, Item>(
    '/api/items',
    {
      onSuccess: (item) => console.log('Created:', item),
      onError: (error) => console.error('Failed:', error),
    }
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    await execute({
      name: formData.get('name') as string,
      price: Number(formData.get('price')),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="price" type="number" required />
      <button disabled={pending}>
        {pending ? 'Creating...' : 'Create Item'}
      </button>
      {result?.error && <p>{result.error}</p>}
    </form>
  );
}
```

### `useHydration()`

Track hydration state for client-only rendering:

```tsx
import { useHydration } from '@riktajs/react';

function TimeDisplay() {
  const { isHydrated, isServer } = useHydration();
  
  // Avoid hydration mismatch
  if (!isHydrated) {
    return <span>Loading...</span>;
  }
  
  return <span>{new Date().toLocaleTimeString()}</span>;
}
```

## Server Controller

Define SSR routes with controllers:

```typescript title="src/controllers/page.controller.ts"
import { SsrController, Ssr, Get, Param, Head } from '@riktajs/ssr';

@SsrController({
  defaults: {
    og: { siteName: 'My App', type: 'website' },
    head: [Head.meta('author', 'Your Team')],
  },
})
export class PageController {
  @Get('/')
  @Ssr({
    title: 'Home - My App',
    description: 'Welcome to our application'
  })
  home() {
    return {
      page: 'home',
      features: ['Fast', 'Secure', 'Scalable']
    };
  }

  @Get('/about')
  @Ssr({ title: 'About Us' })
  about() {
    return {
      page: 'about',
      team: ['Alice', 'Bob', 'Charlie']
    };
  }

  @Get('/item/:id')
  @Ssr({ title: 'Item Details' })
  getItem(@Param('id') id: string) {
    const item = this.findItem(id);
    return {
      page: 'item',
      item,
      params: { id }
    };
  }
}
```

## Native Navigation

This package uses native browser APIs for navigation:

### How It Works

1. User clicks `<a href="/about">`
2. Browser performs full page navigation
3. Server renders the new page with fresh SSR data
4. Page hydrates with updated data

### Programmatic Navigation

```tsx
import { useNavigate } from '@riktajs/react';

function MyComponent() {
  const navigate = useNavigate();

  const handleClick = () => {
    // Uses window.location.href under the hood
    navigate('/about');
  };
}
```

### Benefits

- **Always fresh data** - SSR data is always up-to-date
- **SEO-friendly** - Every page is server-rendered
- **Simpler mental model** - Standard web navigation
- **No complex state management** - Each page is independent

## Example: Full Page Component

```tsx title="src/pages/ItemPage.tsx"
import React from 'react';
import { getSsrData, useParams, useFetch } from '@riktajs/react';

interface Item {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface PageData {
  page: string;
  item: Item;
}

export function ItemPage() {
  const ssrData = getSsrData<PageData>();
  const { id } = useParams<{ id: string }>();
  
  const item = ssrData?.data.item;
  
  // Fetch live stock data (client-side only)
  const { data: stockData } = useFetch<{ stock: number }>(
    `/api/items/${id}/stock`,
    { skip: !item }
  );

  if (!item) return <div>Loading...</div>;

  return (
    <div>
      <h1>{item.name}</h1>
      <p>Price: ${item.price}</p>
      <p>
        Stock: {stockData ? stockData.stock : item.stock}
        {stockData && ' (live)'}
      </p>
      <a href="/">Back to Home</a>
    </div>
  );
}
```

## TypeScript Support

All exports are fully typed:

```typescript
import type {
  SsrData,
  FetchState,
  ActionState,
  HydrationState,
  Location,
  NavigateFn,
  NavigateOptions,
  UseFetchOptions,
  UseActionOptions,
} from '@riktajs/react';
```

## Best Practices

### 1. Use Native Links for Navigation

Always prefer standard `<a>` tags:

```tsx
// ✅ Good
<a href="/about">About</a>

// Use useNavigate() only for programmatic navigation
const navigate = useNavigate();
navigate('/dashboard');
```

### 2. Use getSsrData() for Data Access

Access SSR data directly - no provider needed:

```tsx
// ✅ Good - direct access
const ssrData = getSsrData<PageData>();

// Also good - hook wrapper
const ssrData = useSsrData<PageData>();
```

### 3. Avoid Hydration Mismatches

Use `useHydration()` for client-only content:

```tsx
const { isHydrated } = useHydration();

if (!isHydrated) {
  return <StaticPlaceholder />;
}

return <DynamicContent />;
```

### 4. Use skip with useFetch for Manual Triggers

```tsx
const { data, refetch } = useFetch('/api/data', { skip: true });

// Call when needed
<button onClick={refetch}>Load Data</button>
```
