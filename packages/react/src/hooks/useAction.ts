import { useState, useCallback } from 'react';
import type { ActionResult, ActionState } from '../types.js';

/**
 * Options for useAction hook
 */
export interface UseActionOptions<TResult = unknown> {
  /** Callback on successful action */
  onSuccess?: (result: TResult) => void;
  /** Callback on action error */
  onError?: (error: string) => void;
  /** HTTP method to use */
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Hook for executing server actions (form submissions, mutations)
 * 
 * @param url URL to send the action to
 * @param options Action options
 * @returns Action state with execute, pending, result, and reset
 * 
 * @example
 * ```tsx
 * import { useAction } from '@riktajs/react';
 * 
 * interface CreateItemInput {
 *   name: string;
 *   price: number;
 * }
 * 
 * interface Item {
 *   id: string;
 *   name: string;
 *   price: number;
 * }
 * 
 * function CreateItemForm() {
 *   const { execute, pending, result } = useAction<CreateItemInput, Item>(
 *     '/api/items',
 *     {
 *       onSuccess: (item) => {
 *         console.log('Created item:', item);
 *       },
 *     }
 *   );
 * 
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     const formData = new FormData(e.target as HTMLFormElement);
 *     await execute({
 *       name: formData.get('name') as string,
 *       price: Number(formData.get('price')),
 *     });
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input name="name" required />
 *       <input name="price" type="number" required />
 *       <button disabled={pending}>
 *         {pending ? 'Creating...' : 'Create Item'}
 *       </button>
 *       {result?.error && <p className="error">{result.error}</p>}
 *       {result?.fieldErrors?.name && (
 *         <p className="error">{result.fieldErrors.name[0]}</p>
 *       )}
 *     </form>
 *   );
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // DELETE action
 * const { execute, pending } = useAction<{ id: string }, void>(
 *   '/api/items',
 *   { method: 'DELETE' }
 * );
 * 
 * const handleDelete = () => execute({ id: itemId });
 * ```
 */
export function useAction<TInput = unknown, TResult = unknown>(
  url: string,
  options: UseActionOptions<TResult> = {}
): ActionState<TInput, TResult> {
  const {
    onSuccess,
    onError,
    method = 'POST',
    headers: customHeaders = {},
  } = options;

  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ActionResult<TResult> | null>(null);

  const execute = useCallback(
    async (input: TInput): Promise<ActionResult<TResult>> => {
      setPending(true);
      setResult(null);

      try {
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...customHeaders,
          },
          body: JSON.stringify(input),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle error response
          const actionResult: ActionResult<TResult> = {
            success: false,
            error: data.message || data.error || `HTTP ${response.status}`,
            fieldErrors: data.fieldErrors,
          };
          setResult(actionResult);
          onError?.(actionResult.error!);
          return actionResult;
        }

        // Handle success response
        const actionResult: ActionResult<TResult> = {
          success: true,
          data: data as TResult,
        };
        setResult(actionResult);
        onSuccess?.(data as TResult);
        return actionResult;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred';
        const actionResult: ActionResult<TResult> = {
          success: false,
          error: message,
        };
        setResult(actionResult);
        onError?.(message);
        return actionResult;
      } finally {
        setPending(false);
      }
    },
    [url, method, JSON.stringify(customHeaders), onSuccess, onError]
  );

  const reset = useCallback(() => {
    setResult(null);
  }, []);

  return {
    execute,
    pending,
    result,
    reset,
  };
}
