---
title: React Integration
sidebar_label: React
description: Build server-rendered React applications with @riktajs/react
---

# React SSR Integration

The `@riktajs/react` package provides React-specific hooks and components for building SSR applications with Rikta. It handles routing, data fetching, hydration, and client-side navigation.

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
import { RiktaProvider, type SsrData } from '@riktajs/react';
import { App } from './App';
import { HeadBuilder } from '@riktajs/ssr';

export function render(url: string, context: Record<string, unknown> = {}) {
  // Extract metadata from context
  const { title: contextTitle, description: contextDescription, __SSR_DATA__, ...restContext } = context;
  
  // Create SSR data structure
  const ssrData: SsrData = {
    data: __SSR_DATA__ ?? restContext,
    url,
    title: contextTitle as string | undefined,
    description: contextDescription as string | undefined,
  };

  // Render React app
  const html = renderToString(
    <RiktaProvider ssrData={ssrData}>
      <App />
    </RiktaProvider>
  );

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
import { RiktaProvider } from '@riktajs/react';
import { App } from './App';

const container = document.getElementById('app');

if (container) {
  hydrateRoot(
    container,
    <RiktaProvider>
      <App />
    </RiktaProvider>
  );
}
```

### 3. App Component

```tsx title="src/App.tsx"
import React from 'react';
import { useSsrData, useLocation } from '@riktajs/react';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';

interface SsrDataType {
  page?: string;
  [key: string]: unknown;
}

export function App() {
  const ssrData = useSsrData<SsrDataType>();
  const { search } = useLocation();
  
  // Use URL from ssrData for routing - ensures data and route are in sync
  const ssrUrl = ssrData?.url ?? '/';
  const pathname = ssrUrl.split('?')[0];
  const url = search ? `${pathname}?${search}` : pathname;

  // Route based on pathname
  const renderPage = () => {
    if (pathname === '/about') return <AboutPage />;
    return <HomePage />;
  };

  return (
    <Layout url={url} title={ssrData?.title}>
      {renderPage()}
    </Layout>
  );
}
```

## Components

### `<RiktaProvider>`

Root provider that enables all Rikta React features:

```tsx
import { RiktaProvider } from '@riktajs/react';

function Root() {
  return (
    <RiktaProvider>
      <App />
    </RiktaProvider>
  );
}
```

**Features:**
- Reads `window.__SSR_DATA__` automatically
- Provides routing context
- Handles client-side navigation
- Fetches new page data during navigation

### `<Link>`

Client-side navigation component:

```tsx
import { Link } from '@riktajs/react';

function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/item/123">Item 123</Link>
      
      {/* With options */}
      <Link href="/dashboard" replace>Dashboard</Link>
      <Link href="/next" scroll={false}>Next</Link>
    </nav>
  );
}
```

**Props:**
- `href` (required) - Target URL
- `replace` - Replace history entry instead of push
- `scroll` - Scroll to top after navigation (default: true)
- All standard `<a>` props are supported

## Hooks

### `useSsrData()`

Access SSR data passed from server:

```tsx
import { useSsrData } from '@riktajs/react';

interface PageData {
  page: string;
  items: Array<{ id: string; name: string }>;
}

function ItemList() {
  const ssrData = useSsrData<PageData>();
  
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

### `useNavigation()`

Programmatic navigation:

```tsx
import { useNavigation } from '@riktajs/react';

function MyComponent() {
  const { navigate, pathname, isNavigating } = useNavigation();

  const handleSubmit = async () => {
    await saveData();
    navigate('/success');
  };

  return (
    <div>
      <p>Current path: {pathname}</p>
      {isNavigating && <Spinner />}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
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
import { SsrController, Ssr, Get, Param } from '@riktajs/ssr';

@SsrController()
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

## Client-Side Navigation Data Fetching

When navigating client-side using `<Link>` or `navigate()`, `RiktaProvider` automatically fetches the new page's SSR data:

### How It Works

1. User clicks `<Link href="/about">`
2. `RiktaProvider` intercepts the navigation
3. Fetches `/about` with `X-Rikta-Data: 1` header
4. Server returns JSON instead of HTML:
   ```json
   {
     "data": { "page": "about", "team": [...] },
     "url": "/about",
     "title": "About Us",
     "description": "Learn about our team"
   }
   ```
5. Updates `ssrData` state
6. App re-renders with new data
7. Browser history updated

### Benefits

- **No page flash** - Data fetched before route changes
- **Consistent data structure** - Same shape as initial SSR
- **SEO metadata** - Title and description updated automatically
- **SPA experience** - Smooth navigation without full page reloads

## Example: Full Page Component

```tsx title="src/pages/ItemPage.tsx"
import React from 'react';
import { useSsrData, useParams, Link, useFetch } from '@riktajs/react';

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
  const ssrData = useSsrData<PageData>();
  const { id } = useParams<{ id: string }>();
  
  // Get initial item from SSR data
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
      <Link href="/">Back to Home</Link>
    </div>
  );
}
```

## TypeScript Support

All exports are fully typed:

```typescript
import type {
  SsrData,
  RouterContextValue,
  NavigateOptions,
  FetchState,
  ActionState,
  LinkProps,
  HydrationState,
  Location,
  UseFetchOptions,
  UseActionOptions,
} from '@riktajs/react';
```

## Best Practices

### 1. Route Based on ssrData.url

Always use `ssrData.url` for routing to ensure data and route are in sync:

```tsx
// ✅ Good
const pathname = ssrData?.url?.split('?')[0] ?? '/';

// ❌ Bad - can cause data mismatch
const { pathname } = useLocation();
```

### 2. Avoid Hydration Mismatches

Use `useHydration()` for client-only content:

```tsx
const { isHydrated } = useHydration();

if (!isHydrated) {
  return <StaticPlaceholder />;
}

return <DynamicContent />;
```

### 3. Use skip with useFetch for Manual Triggers

```tsx
const { data, refetch } = useFetch('/api/data', { skip: true });

// Call when needed
<button onClick={refetch}>Load Data</button>
```

### 4. Provide Initial Params

Pass params to `RiktaProvider` for SSR consistency:

```tsx
// In entry-server.tsx
const params = extractParamsFromUrl(url);

<RiktaProvider ssrData={ssrData} initialParams={params}>
  <App />
</RiktaProvider>
```