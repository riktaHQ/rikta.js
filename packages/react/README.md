# @riktajs/react

React utilities for Rikta SSR framework. Provides hooks and components for routing, navigation, SSR data access, and server interactions.

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

## Components

### `<Link>`

Client-side navigation link component that uses the History API instead of full page reloads.

```tsx
import { Link } from '@riktajs/react';

function Navigation() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/items/123">Item 123</Link>
      
      {/* With options */}
      <Link href="/dashboard" replace scroll={false}>
        Dashboard
      </Link>
    </nav>
  );
}
```

**Props:**
- `href` (required): Target URL
- `replace`: Replace history entry instead of push
- `scroll`: Scroll to top after navigation (default: `true`)
- `state`: Additional state to pass to navigation
- All standard `<a>` props are supported

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

### `useNavigation()`

Programmatic navigation hook.

```tsx
import { useNavigation } from '@riktajs/react';

function MyComponent() {
  const { navigate, pathname } = useNavigation();

  const handleSubmit = async () => {
    await saveData();
    navigate('/success');
  };

  // With options
  navigate('/login', { replace: true });
  navigate('/next', { scroll: false });
  navigate('/edit', { state: { from: 'list' } });

  return <button onClick={handleSubmit}>Submit</button>;
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
    setSearchParams({ q: newQuery, page: '1' });
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

Get current location information.

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

Access SSR data passed from server via `window.__SSR_DATA__`. The data structure includes:
- `data`: The actual page data from the controller
- `url`: The current URL
- `title`: Page title (from `@Ssr` decorator)
- `description`: Page description (from `@Ssr` decorator)

```tsx
import { useSsrData } from '@riktajs/react';

interface PageData {
  page: string;
  items: Array<{ id: string; name: string }>;
}

function ItemList() {
  const ssrData = useSsrData<PageData>();
  
  if (!ssrData) return <div>Loading...</div>;
  
  // Access page data
  const { data, title, url } = ssrData;
  
  return (
    <div>
      <h1>{title ?? data.page}</h1>
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

### Client-Side Navigation with SSR Data Fetching

When navigating client-side using `<Link>` or `navigate()`, `RiktaProvider` automatically fetches the SSR data for the new page from the server. This ensures:

1. **No page flash**: Data is fetched before the route changes
2. **Consistent data structure**: Same data shape as initial SSR
3. **SEO metadata**: Title and description are updated automatically

```tsx
// App.tsx - Route based on ssrData.url for data consistency
function App() {
  const ssrData = useSsrData<{ page: string }>();
  
  // Use ssrData.url for routing to ensure data and route are in sync
  const pathname = ssrData?.url?.split('?')[0] ?? '/';
  
  return (
    <Layout title={ssrData?.title}>
      {pathname === '/about' && <AboutPage />}
      {pathname === '/' && <HomePage />}
    </Layout>
  );
}
```

### `useHydration()`

Track hydration state for client-only rendering.

```tsx
import { useHydration } from '@riktajs/react';

function TimeDisplay() {
  const { isHydrated, isServer } = useHydration();
  
  // Avoid hydration mismatch with dynamic content
  if (!isHydrated) {
    return <span>Loading time...</span>;
  }
  
  return <span>{new Date().toLocaleTimeString()}</span>;
}

function ClientOnlyComponent() {
  const { isHydrated } = useHydration();
  
  if (!isHydrated) return null;
  
  return <SomeClientOnlyLibrary />;
}
```

### `useFetch()`

Data fetching hook with loading and error states.

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

// With options
const { data } = useFetch<Item[]>('/api/items', {
  headers: { 'Authorization': `Bearer ${token}` },
  deps: [token],    // Refetch when token changes
  skip: !token,     // Don't fetch until we have a token
  transform: (res) => res.results, // Transform response
});
```

### `useAction()`

Execute server actions (form submissions, mutations).

```tsx
import { useAction } from '@riktajs/react';

interface CreateItemInput {
  name: string;
  price: number;
}

interface Item {
  id: string;
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
      {result?.error && <p className="error">{result.error}</p>}
    </form>
  );
}

// DELETE action
const { execute, pending } = useAction<{ id: string }, void>(
  '/api/items',
  { method: 'DELETE' }
);
```

## TypeScript

All exports are fully typed. Import types as needed:

```tsx
import type {
  SsrData,
  RouterContextValue,
  NavigateOptions,
  ActionResult,
  FetchState,
  ActionState,
  LinkProps,
  HydrationState,
  Location,
} from '@riktajs/react';
```

## Integration with @riktajs/ssr

This package is designed to work seamlessly with `@riktajs/ssr`. The SSR plugin automatically injects `window.__SSR_DATA__` which `RiktaProvider` picks up.

```tsx
// Server: page.controller.ts
@Controller()
export class PageController {
  @Get('/item/:id')
  @Render()
  getItem(@Param('id') id: string) {
    const item = getItemById(id);
    return { item, params: { id } };
  }
}

// Client: ItemPage.tsx
function ItemPage() {
  const ssrData = useSsrData<{ item: Item; params: { id: string } }>();
  const { id } = useParams();
  
  return <h1>{ssrData?.data.item.name} (ID: {id})</h1>;
}
```

## License

MIT
