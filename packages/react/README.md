# @riktajs/react

React utilities for Rikta SSR framework. Provides hooks for SSR data access, navigation, and server interactions using **native browser APIs**.

## Philosophy

This package embraces the web platform by using native browser APIs for navigation:
- Use standard `<a href="...">` tags for links
- Use `useNavigate()` for programmatic navigation (uses `window.location` under the hood)
- Full page loads ensure SSR data is always fresh

## Installation

```bash
npm install @riktajs/react
# or
pnpm add @riktajs/react
# or
yarn add @riktajs/react
```

## Quick Start

Wrap your app with `RiktaProvider` to enable all features:

```tsx
// entry-client.tsx
import { hydrateRoot } from 'react-dom/client';
import { RiktaProvider } from '@riktajs/react';
import App from './App';

hydrateRoot(
  document.getElementById('root')!,
  <RiktaProvider>
    <App />
  </RiktaProvider>
);
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
      <a href="/items/123">Item 123</a>
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
    // Simple navigation
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

## Components

### `<RiktaProvider>`

Root provider component that enables all Rikta React utilities.

```tsx
import { RiktaProvider } from '@riktajs/react';

function App() {
  return (
    <RiktaProvider>
      <YourApp />
    </RiktaProvider>
  );
}
```

## Hooks

### `useNavigate()`

Programmatic navigation hook using native browser APIs.

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

### `useParams()`

Access route parameters extracted from dynamic URLs.

```tsx
import { useParams } from '@riktajs/react';

// For route /item/:id
function ItemPage() {
  const { id } = useParams<{ id: string }>();
  
  return <h1>Item {id}</h1>;
}

// Multiple params - /users/:userId/posts/:postId
function PostPage() {
  const { userId, postId } = useParams<{ userId: string; postId: string }>();
  
  return <h1>Post {postId} by User {userId}</h1>;
}
```

### `useSearchParams()`

Access and update URL search parameters.

```tsx
import { useSearchParams } from '@riktajs/react';

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery, page: 1 });
  };

  return (
    <input 
      value={query} 
      onChange={(e) => handleSearch(e.target.value)} 
    />
  );
}
```

### `useLocation()`

Access current location information directly from `window.location`.

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

### `useSsrData()`

Access SSR data passed from the server via `window.__SSR_DATA__`.

```tsx
import { useSsrData } from '@riktajs/react';

interface PageData {
  title: string;
  items: Array<{ id: string; name: string }>;
}

function ItemList() {
  const ssrData = useSsrData<PageData>();
  
  if (!ssrData) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <h1>{ssrData.data.title}</h1>
      <ul>
        {ssrData.data.items.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### `useHydration()`

Track hydration state for handling SSR vs client rendering differences.

```tsx
import { useHydration } from '@riktajs/react';

function TimeDisplay() {
  const { isHydrated, isServer } = useHydration();
  
  // On server and initial render, show static content
  if (!isHydrated) {
    return <span>Loading time...</span>;
  }
  
  // After hydration, show dynamic content
  return <span>{new Date().toLocaleTimeString()}</span>;
}
```

### `useFetch()`

Data fetching hook with loading and error states.

```tsx
import { useFetch } from '@riktajs/react';

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

### `useAction()`

Execute server actions (mutations, form submissions).

```tsx
import { useAction } from '@riktajs/react';

function CreateItemForm() {
  const { execute, pending, result } = useAction<CreateItemInput, Item>(
    '/api/items',
    {
      onSuccess: (item) => console.log('Created:', item),
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
      {result?.error && <p className="error">{result.error}</p>}
    </form>
  );
}
```

## TypeScript Support

All hooks and components are fully typed. Export types are available:

```tsx
import type {
  SsrData,
  ActionResult,
  FetchState,
  ActionState,
  RiktaProviderProps,
  HydrationState,
  Location,
  NavigateFn,
  NavigateOptions,
} from '@riktajs/react';
```

## Migration from Previous Versions

If you were using the `<Link>` component or `useNavigation()`:

### Before (v1.x)
```tsx
import { Link, useNavigation } from '@riktajs/react';

function Nav() {
  const { navigate, pathname } = useNavigation();
  
  return (
    <nav>
      <Link href="/about">About</Link>
      <button onClick={() => navigate('/search', { state: { from: 'nav' } })}>
        Search
      </button>
    </nav>
  );
}
```

### After (v2.x)
```tsx
import { useNavigate, useLocation } from '@riktajs/react';

function Nav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  
  return (
    <nav>
      <a href="/about">About</a>
      <button onClick={() => navigate('/search', { q: '' })}>
        Search
      </button>
    </nav>
  );
}
```

## License

MIT
