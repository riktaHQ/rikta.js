import { Injectable, Autowired, OnProviderInit, OnProviderDestroy } from '@riktajs/core';
import {Logger, DATABASE_CONFIG, LOGGER } from '../config/app.config.js';
import {DatabaseConfigProvider} from "../config/database-config.provider.js";

/**
 * Base entity interface
 */
export interface Entity {
  id: string;
}

/**
 * Simple in-memory database service
 * 
 * Demonstrates:
 * - Priority initialization (priority: 100 = initialized first)
 * - OnProviderInit hook for connection
 * - OnProviderDestroy hook for cleanup
 */
@Injectable({ priority: 100 })
export class DatabaseService implements OnProviderInit, OnProviderDestroy {
  private collections = new Map<string, Map<string, Entity>>();
  private isConnected = false;

  constructor(
    @Autowired(DATABASE_CONFIG) private config: DatabaseConfigProvider,
    @Autowired(LOGGER) private logger: Logger
  ) {}

  /**
   * Called during initialization (after constructor)
   */
  async onProviderInit(): Promise<void> {
    // Simulate async connection
    await new Promise(resolve => setTimeout(resolve, 10));
    this.isConnected = true;
    this.logger.info(`Database connected to ${this.config.dbHost}:${this.config.dbPort}/${this.config.dbName}`);
  }

  /**
   * Called during shutdown (in reverse priority order)
   */
  async onProviderDestroy(): Promise<void> {
    this.isConnected = false;
    this.logger.info('Database connection closed');
  }

  /**
   * Get or create a collection
   */
  private getCollection(name: string): Map<string, Entity> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
      this.logger.debug(`Collection "${name}" created`);
    }
    return this.collections.get(name)!;
  }

  /**
   * Insert a document
   */
  insert<T extends Entity>(collection: string, doc: T): T {
    const col = this.getCollection(collection);
    col.set(doc.id, doc);
    this.logger.debug(`Inserted document ${doc.id} into ${collection}`);
    return doc;
  }

  /**
   * Find a document by ID
   */
  findById<T extends Entity>(collection: string, id: string): T | undefined {
    return this.getCollection(collection).get(id) as T | undefined;
  }

  /**
   * Find all documents in a collection
   */
  findAll<T extends Entity>(collection: string): T[] {
    return Array.from(this.getCollection(collection).values()) as T[];
  }

  /**
   * Update a document
   */
  update<T extends Entity>(collection: string, id: string, data: Partial<T>): T | undefined {
    const col = this.getCollection(collection);
    const existing = col.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...data, id } as T;
    col.set(id, updated);
    this.logger.debug(`Updated document ${id} in ${collection}`);
    return updated;
  }

  /**
   * Delete a document
   */
  delete(collection: string, id: string): boolean {
    const result = this.getCollection(collection).delete(id);
    if (result) {
      this.logger.debug(`Deleted document ${id} from ${collection}`);
    }
    return result;
  }

  /**
   * Check if connected
   */
  isActive(): boolean {
    return this.isConnected;
  }
}
