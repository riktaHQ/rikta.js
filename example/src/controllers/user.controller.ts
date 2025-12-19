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
  Autowired 
} from '../../../src';
import { UserService, User, CreateUserDto } from '../services/user.service';

/**
 * User REST API Controller
 */
@Controller('/users')
export class UserController {
  
  @Autowired()
  private userService!: UserService;

  /**
   * GET /users
   * Get all users with optional limit
   */
  @Get()
  findAll(@Query('limit') limit?: string): User[] {
    const users = this.userService.findAll();
    
    if (limit) {
      return users.slice(0, parseInt(limit, 10));
    }
    
    return users;
  }

  /**
   * GET /users/:id
   * Get user by ID
   */
  @Get('/:id')
  findOne(@Param('id') id: string): User | { error: string; statusCode: number } {
    const user = this.userService.findById(id);
    
    if (!user) {
      return { error: 'User not found', statusCode: 404 };
    }
    
    return user;
  }

  /**
   * POST /users
   * Create a new user
   */
  @Post()
  @HttpCode(201)
  create(@Body() data: CreateUserDto): User {
    return this.userService.create(data);
  }

  /**
   * PUT /users/:id
   * Update a user
   */
  @Put('/:id')
  update(
    @Param('id') id: string, 
    @Body() data: Partial<CreateUserDto>
  ): User | { error: string; statusCode: number } {
    const user = this.userService.update(id, data);
    
    if (!user) {
      return { error: 'User not found', statusCode: 404 };
    }
    
    return user;
  }

  /**
   * DELETE /users/:id
   * Delete a user
   */
  @Delete('/:id')
  delete(@Param('id') id: string): { success: boolean } | { error: string; statusCode: number } {
    const success = this.userService.delete(id);
    
    if (!success) {
      return { error: 'User not found', statusCode: 404 };
    }
    
    return { success: true };
  }
}

