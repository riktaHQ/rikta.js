import { useContext } from 'react';
import { SsrContext } from '../context/SsrContext.js';
import type { SsrData } from '../types.js';

/**
 * Hook to access SSR data passed from server
 * 
 * SSR data is passed via window.__SSR_DATA__ and contains
 * the initial data rendered on the server.
 * 
 * @returns SSR data object or null if not available
 * 
 * @example
 * ```tsx
 * import { useSsrData } from '@riktajs/react';
 * 
 * interface PageData {
 *   title: string;
 *   items: Array<{ id: string; name: string }>;
 * }
 * 
 * function ItemList() {
 *   const ssrData = useSsrData<PageData>();
 *   
 *   if (!ssrData) {
 *     return <div>Loading...</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <h1>{ssrData.data.title}</h1>
 *       <ul>
 *         {ssrData.data.items.map(item => (
 *           <li key={item.id}>{item.name}</li>
 *         ))}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Access just the data
 * function MyComponent() {
 *   const ssrData = useSsrData<{ user: User }>();
 *   const user = ssrData?.data.user;
 *   
 *   return user ? <UserProfile user={user} /> : <LoginPrompt />;
 * }
 * ```
 */
export function useSsrData<T = unknown>(): SsrData<T> | null {
  const context = useContext(SsrContext);
  return context as SsrData<T> | null;
}
