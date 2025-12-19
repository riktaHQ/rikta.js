import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Param, 
  Body, 
  Query,
  HttpCode,
  Autowired,
  NotFoundException,
} from '@riktajs/core';
import { 
  UserService, 
  User, 
  CreateUserSchema, 
  UpdateUserSchema,
  PaginationSchema,
  CreateUserDto,
  UpdateUserDto,
  PaginationQuery,
} from '../services/user.service';

/**
 * User REST API Controller
 * 
 * Demonstrates Zod validation with automatic type inference.
 * All request bodies and query parameters are validated before
 * reaching the handler methods.
 */
@Controller('/users')
export class UserController {
  
  @Autowired()
  private userService!: UserService;

  /**
   * GET /users
   * Get all users with optional pagination
   * 
   * Query params are validated and coerced to numbers automatically
   */
  @Get()
  findAll(@Query(PaginationSchema) query: PaginationQuery): User[] {
    const users = this.userService.findAll();
    
    const offset = query.offset ?? 0;
    const limit = query.limit ?? users.length;
    
    return users.slice(offset, offset + limit);
  }

  /**
   * GET /users/:id
   * Get user by ID
   */
  @Get('/:id')
  findOne(@Param('id') id: string): User {
    const user = this.userService.findById(id);
    
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    
    return user;
  }

  /**
   * POST /users
   * Create a new user
   * 
   * Body is validated against CreateUserSchema:
   * - name: required, min 1 character
   * - email: required, valid email format
   * 
   * Type is automatically inferred as { name: string; email: string }
   */
  @Post()
  @HttpCode(201)
  create(@Body(CreateUserSchema) data: CreateUserDto): User {
    return this.userService.create(data);
  }

  /**
   * PUT /users/:id
   * Update a user
   * 
   * Body is validated against UpdateUserSchema (partial of CreateUserSchema)
   * All fields are optional for partial updates
   */
  @Put('/:id')
  update(
    @Param('id') id: string, 
    @Body(UpdateUserSchema) data: UpdateUserDto
  ): User {
    const user = this.userService.update(id, data);
    
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    
    return user;
  }

  /**
   * DELETE /users/:id
   * Delete a user
   */
  @Delete('/:id')
  delete(@Param('id') id: string): { success: boolean } {
    const success = this.userService.delete(id);
    
    if (!success) {
      throw new NotFoundException(`User ${id} not found`);
    }
    
    return { success: true };
  }
}

