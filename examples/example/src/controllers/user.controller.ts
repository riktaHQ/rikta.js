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
  UseMiddleware,
} from '@riktajs/core';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@riktajs/swagger';
import { z } from 'zod';
import { 
  UserService, 
  User, 
  CreateUserSchema, 
  UpdateUserSchema,
  PaginationSchema,
  CreateUserDto,
  UpdateUserDto,
  PaginationQuery,
} from '../services/user.service.js';
import { LoggerMiddleware, ResponseTimeMiddleware } from '../middleware/index.js';
// Import custom decorators
import { 
  ClientIp, 
  UserAgent, 
  RequestId, 
  Lang, 
  Tracked, 
  Public, 
  Cached 
} from '../decorators/index.js';

// Response schema for array of users
const UserArraySchema = z.array(z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
}));

// Single user response schema
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

/**
 * User REST API Controller
 * 
 * Demonstrates Zod validation with automatic type inference.
 * All request bodies and query parameters are validated before
 * reaching the handler methods.
 * 
 * Also demonstrates @UseMiddleware for request logging and timing.
 */
@ApiTags('Users')
@Controller('/users')
@UseMiddleware(LoggerMiddleware, ResponseTimeMiddleware)
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
  @ApiOperation({ summary: 'List all users', description: 'Get all users with optional pagination' })
  @ApiQuery({ name: 'offset', type: 'integer', required: false, description: 'Number of items to skip' })
  @ApiQuery({ name: 'limit', type: 'integer', required: false, description: 'Maximum number of items to return' })
  @ApiResponse({ status: 200, description: 'Array of users', schema: UserArraySchema })
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
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a single user by their unique identifier' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User unique identifier' })
  @ApiResponse({ status: 200, description: 'User found', schema: UserSchema })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({ summary: 'Create a new user', description: 'Create a new user with name and email' })
  @ApiBody({ schema: CreateUserSchema, description: 'User creation data' })
  @ApiResponse({ status: 201, description: 'User created successfully', schema: UserSchema })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
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
  @ApiOperation({ summary: 'Update a user', description: 'Update user fields (partial update supported)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User unique identifier' })
  @ApiBody({ schema: UpdateUserSchema, description: 'User update data' })
  @ApiResponse({ status: 200, description: 'User updated successfully', schema: UserSchema })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({ summary: 'Delete a user', description: 'Permanently delete a user by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User unique identifier' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  delete(@Param('id') id: string): { success: boolean } {
    const success = this.userService.delete(id);
    
    if (!success) {
      throw new NotFoundException(`User ${id} not found`);
    }
    
    return { success: true };
  }

  // ============================================================================
  // Endpoints demonstrating Custom Decorators
  // ============================================================================

  /**
   * GET /users/request-info
   * Demonstrates custom param decorators: @ClientIp, @UserAgent, @RequestId, @Lang
   */
  @Get('/request-info')
  @Tracked()
  @ApiOperation({ 
    summary: 'Get request info', 
    description: 'Demonstrates custom parameter decorators by returning request metadata' 
  })
  @ApiResponse({ status: 200, description: 'Request information extracted via custom decorators' })
  getRequestInfo(
    @ClientIp() ip: string,
    @UserAgent() userAgent: string,
    @RequestId() requestId: string,
    @Lang('en') language: string
  ) {
    return {
      message: 'Custom decorators in action!',
      requestInfo: {
        clientIp: ip,
        userAgent: userAgent,
        requestId: requestId,
        preferredLanguage: language,
      },
      decoratorsUsed: [
        '@ClientIp() - Extracts client IP from request',
        '@UserAgent() - Extracts User-Agent header',
        '@RequestId() - Gets or generates request correlation ID',
        '@Lang("en") - Gets preferred language with default fallback',
        '@Tracked() - Composed decorator for request tracking metadata'
      ]
    };
  }

  /**
   * GET /users/greeting
   * Demonstrates @Lang decorator with localized responses
   */
  @Get('/greeting')
  @Public()
  @Cached(60)
  @ApiOperation({ 
    summary: 'Get localized greeting', 
    description: 'Returns a greeting in the users preferred language' 
  })
  @ApiResponse({ status: 200, description: 'Localized greeting message' })
  getGreeting(@Lang('en') lang: string) {
    const greetings: Record<string, string> = {
      en: 'Hello! Welcome to Rikta Framework',
      es: '¡Hola! Bienvenido a Rikta Framework',
      it: 'Ciao! Benvenuto in Rikta Framework',
      fr: 'Bonjour! Bienvenue dans Rikta Framework',
      de: 'Hallo! Willkommen bei Rikta Framework',
      pt: 'Olá! Bem-vindo ao Rikta Framework',
    };

    return {
      language: lang,
      greeting: greetings[lang] || greetings.en,
      decoratorsUsed: [
        '@Lang("en") - Extracts Accept-Language header with default',
        '@Public() - Marks endpoint as publicly accessible',
        '@Cached(60) - Sets cache TTL metadata to 60 seconds'
      ]
    };
  }
}

