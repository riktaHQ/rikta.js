import { getSsrData } from '../utils/getSsrData.js';

/**
 * Hook to access route parameters from SSR data
 * 
 * Route parameters are extracted from the URL path by the server
 * and passed via SSR data. This hook reads them from the SSR data.
 * 
 * @returns Object with route parameter values
 * 
 * @example
 * ```tsx
 * // For route /item/:id
 * import { useParams } from '@riktajs/react';
 * 
 * function ItemPage() {
 *   const { id } = useParams<{ id: string }>();
 *   
 *   return <h1>Item {id}</h1>;
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Multiple params - /users/:userId/posts/:postId
 * function PostPage() {
 *   const { userId, postId } = useParams<{ userId: string; postId: string }>();
 *   
 *   return <h1>Post {postId} by User {userId}</h1>;
 * }
 * ```
 */
export function useParams<T extends Record<string, string> = Record<string, string>>(): T {
  const ssrData = getSsrData();
  
  // Extract params from SSR data meta
  const params = (ssrData?.meta?.params as T) ?? ({} as T);
  
  return params;
}
