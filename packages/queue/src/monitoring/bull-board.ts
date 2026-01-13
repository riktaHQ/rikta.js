/**
 * Bull Board integration for queue monitoring
 * 
 * This module provides optional Bull Board dashboard integration.
 * Bull Board packages are NOT included as dependencies - install them separately:
 * 
 * npm install @bull-board/api @bull-board/fastify
 * 
 * @example
 * ```typescript
 * import { registerBullBoard } from '@riktajs/queue';
 * 
 * // In your Rikta bootstrap:
 * const app = await Rikta.create();
 * 
 * // After queue provider is initialized:
 * await registerBullBoard(app.server, {
 *   queues: queueProvider.getAllQueues(),
 *   path: '/admin/queues',
 *   auth: async (req) => {
 *     // Your auth logic here
 *     return req.headers.authorization === 'Bearer secret';
 *   },
 * });
 * ```
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Queue } from 'bullmq';

/** Options for Bull Board registration */
export interface BullBoardOptions {
  /** Queues to display in the dashboard */
  queues: Queue[];
  /** Base path for the dashboard (default: '/admin/queues') */
  path?: string;
  /** Authentication function - return true to allow access */
  auth?: (request: FastifyRequest) => boolean | Promise<boolean>;
  /** Whether to use read-only mode */
  readOnly?: boolean;
}

/** Result of Bull Board registration */
export interface BullBoardResult {
  /** The path where the dashboard is mounted */
  path: string;
  /** Function to add more queues dynamically */
  addQueue: (queue: Queue) => void;
  /** Function to remove a queue from the dashboard */
  removeQueue: (queueName: string) => void;
}

/**
 * Register Bull Board dashboard with Fastify
 * 
 * @param app - Fastify instance
 * @param options - Dashboard configuration
 * @returns Bull Board control object
 * 
 * @throws BullBoardNotInstalledError if @bull-board packages are not installed
 * 
 * @example
 * ```typescript
 * const board = await registerBullBoard(app.server, {
 *   queues: queueProvider.getAllQueues(),
 *   path: '/admin/queues',
 *   auth: (req) => checkAdminAuth(req),
 * });
 * 
 * // Add more queues later
 * board.addQueue(newQueue);
 * ```
 */
export async function registerBullBoard(
  app: FastifyInstance,
  options: BullBoardOptions
): Promise<BullBoardResult> {
  const { queues, path = '/admin/queues', auth, readOnly = false } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createBullBoard: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let BullMQAdapter: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let FastifyAdapter: any;

  try {
    // Dynamic imports - these will fail if packages not installed
    // Use require for better compatibility
    createBullBoard = require('@bull-board/api').createBullBoard;
    FastifyAdapter = require('@bull-board/fastify').FastifyAdapter;
    BullMQAdapter = require('@bull-board/api/bullMQAdapter').BullMQAdapter;
  } catch {
    throw new BullBoardNotInstalledError();
  }

  // Create adapters for all queues
  const queueAdapters = queues.map(
    queue => new BullMQAdapter(queue, { readOnlyMode: readOnly })
  );

  // Create the server adapter
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath(path);

  // Create Bull Board
  const board = createBullBoard({
    queues: queueAdapters,
    serverAdapter,
  });

  // Add auth hook if provided
  if (auth) {
    app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      const url = request.url;
      if (url.startsWith(path)) {
        const isAuthorized = await auth(request);
        if (!isAuthorized) {
          reply.code(403).send({ error: 'Forbidden' });
        }
      }
    });
  }

  // Register the plugin
  await app.register(serverAdapter.registerPlugin(), { basePath: path, prefix: path });

  console.log(`📊 Bull Board: Dashboard available at ${path}`);

  return {
    path,
    addQueue: (queue: Queue) => {
      const adapter = new BullMQAdapter(queue, { readOnlyMode: readOnly });
      board.addQueue(adapter);
    },
    removeQueue: (queueName: string) => {
      board.removeQueue(queueName);
    },
  };
}

/**
 * Error thrown when Bull Board packages are not installed
 */
export class BullBoardNotInstalledError extends Error {
  constructor() {
    super(
      'Bull Board packages are not installed. ' +
      'Install them with: npm install @bull-board/api @bull-board/fastify'
    );
    this.name = 'BullBoardNotInstalledError';
  }
}
