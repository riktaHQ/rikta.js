import { Injectable, Autowired } from '../../../src';
import { DatabaseService, Entity } from './database.service';
import { Logger, LOGGER } from '../config/app.config';

export interface User extends Entity {
  name: string;
  email: string;
  createdAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
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

