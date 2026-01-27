import { Injectable, Autowired, z } from '@riktajs/core';
import { DatabaseService, Entity } from './database.service.js';
import { Logger, LOGGER } from '../config/app.config.js';

// ============================================================================
// Zod Schemas with automatic type inference
// ============================================================================

/**
 * Schema for creating a new user
 * Validates: name (min 1 char), email (valid email format)
 */
export const CreateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
});

/**
 * Schema for updating a user (all fields optional)
 */
export const UpdateUserSchema = CreateUserSchema.partial();

/**
 * Schema for pagination query parameters
 */
export const PaginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ============================================================================
// Types inferred from Zod schemas
// ============================================================================

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
export type PaginationQuery = z.infer<typeof PaginationSchema>;

export interface User extends Entity {
  name: string;
  email: string;
  createdAt: string;
}

/**
 * User business logic service
 */
@Injectable()
export class UserService {
  private readonly COLLECTION = 'users';

  @Autowired()
  private db!: DatabaseService;

  @Autowired(LOGGER)
  private logger!: Logger;

  /**
   * Get all users
   */
  findAll(): User[] {
    this.logger.info('Fetching all users');
    return this.db.findAll<User>(this.COLLECTION);
  }

  /**
   * Get user by ID
   */
  findById(id: string): User | undefined {
    this.logger.info(`Fetching user ${id}`);
    return this.db.findById<User>(this.COLLECTION, id);
  }

  /**
   * Create a new user
   */
  create(data: CreateUserDto): User {
    const user: User = {
      id: this.generateId(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    this.logger.info(`Creating user: ${user.name}`);
    return this.db.insert(this.COLLECTION, user);
  }

  /**
   * Update a user
   */
  update(id: string, data: Partial<CreateUserDto>): User | undefined {
    this.logger.info(`Updating user ${id}`);
    return this.db.update<User>(this.COLLECTION, id, data);
  }

  /**
   * Delete a user
   */
  delete(id: string): boolean {
    this.logger.info(`Deleting user ${id}`);
    return this.db.delete(this.COLLECTION, id);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}

