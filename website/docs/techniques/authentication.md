# Authentication with Local Strategy

This guide covers username/password authentication in Rikta using the `@riktajs/passport` package with the Local Strategy.

## Overview

The Local Strategy provides traditional username/password authentication with session-based user management. It's perfect for applications that need:

- **Traditional login forms** - Username and password fields
- **Session management** - Secure server-side sessions
- **Type safety** - Full TypeScript support
- **Easy integration** - Works seamlessly with Rikta's decorator system

## Installation

```bash
npm install @riktajs/passport passport passport-local @fastify/passport @fastify/secure-session
```

## Quick Start

### 1. Register the Passport Plugin

```typescript
import { Rikta } from '@riktajs/core';
import { registerPassport } from '@riktajs/passport';

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  // Register passport with session support
  await registerPassport(app.server, {
    secret: process.env.SESSION_SECRET!, // Must be at least 32 characters
    cookie: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
    cookieName: 'rikta_session',
  });

  await app.listen();
}

bootstrap();
```

### 2. Create User Service

```typescript
import { Injectable } from '@riktajs/core';
import bcrypt from 'bcrypt';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

interface InternalUser extends User {
  passwordHash: string;
}

@Injectable()
export class UsersService {
  // In production, use a database
  private users: InternalUser[] = [
    {
      id: '1',
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 10),
      email: 'admin@example.com',
      role: 'admin',
    },
  ];

  async findByUsername(username: string): Promise<User | null> {
    const user = this.users.find(u => u.username === username);
    if (!user) return null;
    
    const { passwordHash, ...result } = user;
    return result;
  }

  async validatePassword(user: InternalUser, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.find(u => u.id === id);
    if (!user) return null;
    
    const { passwordHash, ...result } = user;
    return result;
  }
}
```

### 3. Create Auth Service

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { UsersService, User } from '../users/users.service';

@Injectable()
export class AuthService {
  @Autowired()
  private usersService!: UsersService;

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isValid = await this.usersService.validatePassword(user, password);
    
    if (!isValid) {
      return null;
    }
    
    return user;
  }
}
```

### 4. Implement Local Strategy

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { PassportStrategy, LocalStrategyBase } from '@riktajs/passport';
import { AuthService } from './auth.service';
import { User } from '../users/users.service';

@Injectable()
@PassportStrategy('local')
export class LocalStrategy extends LocalStrategyBase<User> {
  @Autowired()
  private authService!: AuthService;

  async validate(username: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(username, password);
    
    if (!user) {
      throw new Error('Invalid username or password');
    }
    
    return user;
  }
}
```

### 5. Create Auth Controller

```typescript
import { Controller, Post, Get, Body, Req, HttpCode } from '@riktajs/core';
import { Authenticated, CurrentUser } from '@riktajs/passport';
import type { FastifyRequest } from 'fastify';
import { User } from '../users/users.service';

interface LoginDto {
  username: string;
  password: string;
}

@Controller('/auth')
export class AuthController {
  @Post('/login')
  @HttpCode(200)
  async login(
    @Body() credentials: LoginDto,
    @Req() request: FastifyRequest,
  ) {
    // Passport will validate credentials via LocalStrategy
    const user = await new Promise<User>((resolve, reject) => {
      request.logIn(credentials, (err: Error) => {
        if (err) {
          reject(new Error('Authentication failed'));
        } else {
          resolve(request.user as User);
        }
      });
    });
    
    return {
      message: 'Login successful',
      user,
    };
  }

  @Post('/logout')
  @HttpCode(200)
  async logout(@Req() request: FastifyRequest) {
    await new Promise<void>((resolve) => {
      request.logOut(() => resolve());
    });
    
    return { message: 'Logged out successfully' };
  }

  @Get('/profile')
  @Authenticated()
  getProfile(@CurrentUser() user: User) {
    return { user };
  }

  @Get('/status')
  checkStatus(@Req() request: FastifyRequest) {
    return {
      isAuthenticated: request.isAuthenticated(),
      user: request.user || null,
    };
  }
}
```

## Protecting Routes

### Method-Level Protection

```typescript
@Controller('/api')
export class ApiController {
  @Get('/public')
  publicEndpoint() {
    return { data: 'public' };
  }

  @Get('/private')
  @Authenticated()
  privateEndpoint(@CurrentUser() user: User) {
    return { data: 'private', user };
  }

  @Get('/admin')
  @Authenticated({ message: 'Admin access required' })
  adminEndpoint(@CurrentUser() user: User) {
    if (user.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }
    return { data: 'admin' };
  }
}
```

### Class-Level Protection

```typescript
@Controller('/secure')
@Authenticated() // All routes require authentication
export class SecureController {
  @Get('/data')
  getData(@CurrentUser() user: User) {
    return { data: 'secure data', user };
  }

  @Get('/settings')
  getSettings(@CurrentUser() user: User) {
    return { settings: user.settings };
  }
}
```

## Custom Field Names

Use email instead of username:

```typescript
@Injectable()
@PassportStrategy('local', { usernameField: 'email' })
export class EmailLocalStrategy extends LocalStrategyBase<User> {
  @Autowired()
  private authService!: AuthService;

  async validate(email: string, password: string): Promise<User> {
    const user = await this.authService.validateByEmail(email, password);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    return user;
  }
}
```

## Guards

### AuthGuard

```typescript
import { UseGuards } from '@riktajs/core';
import { AuthGuard } from '@riktajs/passport';

@Controller('/api')
@UseGuards(AuthGuard) // Only enforces auth if @Authenticated is present
export class ApiController {
  @Get('/public')
  publicRoute() {
    return { data: 'public' };
  }

  @Get('/private')
  @Authenticated()
  privateRoute() {
    return { data: 'private' };
  }
}
```

### StrictAuthGuard

```typescript
import { UseGuards } from '@riktajs/core';
import { StrictAuthGuard } from '@riktajs/passport';

@Controller('/admin')
@UseGuards(StrictAuthGuard) // Always requires auth
export class AdminController {
  @Get('/dashboard')
  getDashboard(@CurrentUser() user: User) {
    return { dashboard: 'data' };
  }
}
```

## Best Practices

### 1. Always Hash Passwords

```typescript
import bcrypt from 'bcrypt';

// When creating a user
const passwordHash = await bcrypt.hash(password, 10);

// When validating
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### 2. Use Environment Variables

```typescript
// .env
SESSION_SECRET=your-super-secret-key-at-least-32-characters-long

// main.ts
await registerPassport(app.server, {
  secret: process.env.SESSION_SECRET!,
});
```

### 3. Enable Secure Cookies in Production

```typescript
await registerPassport(app.server, {
  secret: process.env.SESSION_SECRET!,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
  },
});
```

### 4. Never Expose Password Hashes

```typescript
async findByUsername(username: string): Promise<User | null> {
  const user = await this.userRepo.findOne({ username });
  if (!user) return null;
  
  // Remove sensitive data
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}
```

### 5. Use Descriptive Error Messages

```typescript
@Post('/login')
async login(@Body() credentials: LoginDto) {
  try {
    const user = await this.authService.validateUser(
      credentials.username,
      credentials.password
    );
    
    if (!user) {
      throw new HttpException('Invalid username or password', 401);
    }
    
    return { user };
  } catch (error) {
    throw new HttpException('Authentication failed', 401);
  }
}
```