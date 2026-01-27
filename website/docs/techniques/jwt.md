# JWT Authentication

This guide covers stateless JWT (JSON Web Token) authentication in Rikta using the `@riktajs/passport` package with the JWT Strategy.

## Overview

JWT authentication provides stateless, token-based authentication that's perfect for:

- **API-first applications** - RESTful APIs without sessions
- **Mobile apps** - Token-based authentication
- **Microservices** - Stateless authentication across services
- **Single Page Applications (SPA)** - Frontend apps with separate backends

## Installation

```bash
npm install @riktajs/passport passport passport-jwt jsonwebtoken @types/jsonwebtoken
```

## Quick Start

### 1. Register Passport Plugin (Stateless)

```typescript
import { Rikta } from '@riktajs/core';
import { registerPassport } from '@riktajs/passport';

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  // Register passport without sessions for stateless JWT
  await registerPassport(app.server, {
    secret: process.env.SESSION_SECRET!, // Still needed for secure-session
    session: false, // Disable sessions for JWT
  });

  await app.listen();
}

bootstrap();
```

### 2. Create JWT Service

```typescript
import { Injectable } from '@riktajs/core';
import * as jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtService {
  private readonly secret = process.env.JWT_SECRET!;
  private readonly expiresIn = '7d';

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
    });
  }

  verify(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret) as JwtPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  decode(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}
```

### 3. Implement JWT Strategy

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { PassportStrategy } from '@riktajs/passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { UsersService, User } from '../users/users.service';
import { JwtPayload } from './jwt.service';

@Injectable()
@PassportStrategy('jwt', {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: process.env.JWT_SECRET!,
})
export class JwtAuthStrategy {
  @Autowired()
  private usersService!: UsersService;

  /**
   * Validate JWT payload and return user object
   * This method is called by Passport after verifying the token
   */
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  /**
   * Get the underlying Passport strategy instance
   */
  getStrategy(): JwtStrategy {
    const options = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    };

    return new JwtStrategy(options, async (payload, done) => {
      try {
        const user = await this.validate(payload);
        done(null, user);
      } catch (error) {
        done(error, false);
      }
    });
  }
}
```

### 4. Create Auth Controller

```typescript
import { Controller, Post, Get, Body, HttpCode } from '@riktajs/core';
import { Authenticated, CurrentUser } from '@riktajs/passport';
import { Injectable, Autowired } from '@riktajs/core';
import { AuthService } from './auth.service';
import { JwtService } from './jwt.service';
import { User } from '../users/users.service';

interface LoginDto {
  username: string;
  password: string;
}

interface RegisterDto {
  username: string;
  password: string;
  email: string;
}

@Controller('/auth')
export class AuthController {
  @Autowired()
  private authService!: AuthService;

  @Autowired()
  private jwtService!: JwtService;

  @Post('/register')
  @HttpCode(201)
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(
      dto.username,
      dto.password,
      dto.email
    );

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      message: 'Registration successful',
      user,
      access_token: token,
    };
  }

  @Post('/login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const user = await this.authService.validateUser(
      dto.username,
      dto.password
    );

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      message: 'Login successful',
      user,
      access_token: token,
    };
  }

  @Get('/profile')
  @Authenticated()
  getProfile(@CurrentUser() user: User) {
    return { user };
  }

  @Get('/verify')
  @Authenticated()
  verifyToken(@CurrentUser() user: User) {
    return {
      valid: true,
      user,
    };
  }
}
```

### 5. Update Auth Service

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { UsersService, User } from '../users/users.service';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  @Autowired()
  private usersService!: UsersService;

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      return null;
    }
    
    return user;
  }

  async register(username: string, password: string, email: string): Promise<User> {
    const existing = await this.usersService.findByUsername(username);
    
    if (existing) {
      throw new Error('Username already exists');
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    return this.usersService.create({
      username,
      passwordHash,
      email,
      role: 'user',
    });
  }
}
```

## Using JWT Tokens

### Client-Side Usage

```typescript
// After login, store the token
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user', password: 'pass' }),
});

const { access_token } = await response.json();

// Store token (localStorage, sessionStorage, or memory)
localStorage.setItem('access_token', access_token);

// Use token in subsequent requests
const protectedResponse = await fetch('/auth/profile', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
  },
});
```

### Protecting Routes

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
  @Authenticated()
  adminEndpoint(@CurrentUser() user: User) {
    if (user.role !== 'admin') {
      throw new Error('Forbidden');
    }
    return { data: 'admin' };
  }
}
```

## Advanced Configuration

### Custom Token Extraction

```typescript
import { ExtractJwt } from 'passport-jwt';

@Injectable()
@PassportStrategy('jwt', {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    ExtractJwt.fromUrlQueryParameter('token'),
    (request) => request.cookies?.jwt, // From cookie
  ]),
  secretOrKey: process.env.JWT_SECRET!,
})
export class JwtAuthStrategy {
  // ...
}
```

### Token Refresh

```typescript
@Injectable()
export class JwtService {
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  signAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: this.accessTokenExpiry,
    });
  }

  signRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: this.refreshTokenExpiry,
    });
  }
}

@Controller('/auth')
export class AuthController {
  @Post('/refresh')
  @HttpCode(200)
  async refresh(@Body() body: { refresh_token: string }) {
    try {
      const payload = jwt.verify(
        body.refresh_token,
        process.env.JWT_REFRESH_SECRET!
      ) as JwtPayload;

      const user = await this.usersService.findById(payload.sub);
      
      if (!user) {
        throw new Error('User not found');
      }

      const newAccessToken = this.jwtService.signAccessToken({
        sub: user.id,
        username: user.username,
        email: user.email,
      });

      return {
        access_token: newAccessToken,
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}
```

### Multiple JWT Strategies

```typescript
// Access token strategy
@Injectable()
@PassportStrategy('jwt')
export class JwtStrategy {
  async validate(payload: JwtPayload): Promise<User> {
    return this.usersService.findById(payload.sub);
  }
}

// Refresh token strategy
@Injectable()
@PassportStrategy('jwt-refresh', {
  jwtFromRequest: ExtractJwt.fromBodyField('refresh_token'),
  secretOrKey: process.env.JWT_REFRESH_SECRET!,
})
export class JwtRefreshStrategy {
  async validate(payload: JwtPayload): Promise<User> {
    return this.usersService.findById(payload.sub);
  }
}
```

## Best Practices

### 1. Use Strong Secrets

```typescript
// Generate a strong secret
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

// .env
JWT_SECRET=your-256-bit-secret-here
JWT_REFRESH_SECRET=different-256-bit-secret-here
```

### 2. Set Appropriate Expiration Times

```typescript
const token = jwt.sign(payload, secret, {
  expiresIn: '15m', // Short-lived access tokens
});

const refreshToken = jwt.sign(payload, refreshSecret, {
  expiresIn: '7d', // Longer-lived refresh tokens
});
```

### 3. Validate Token Claims

```typescript
async validate(payload: JwtPayload): Promise<User> {
  // Check if token is not expired
  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('Token expired');
  }

  // Check if user still exists and is active
  const user = await this.usersService.findById(payload.sub);
  
  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  return user;
}
```

### 4. Store Minimal Data in Tokens

```typescript
// ❌ Bad - storing sensitive data
const token = jwt.sign({
  sub: user.id,
  username: user.username,
  password: user.password, // Never store passwords
  creditCard: user.creditCard, // Never store sensitive data
}, secret);

// ✅ Good - minimal claims
const token = jwt.sign({
  sub: user.id,
  username: user.username,
  role: user.role,
}, secret);
```

### 5. Implement Token Blacklisting

```typescript
@Injectable()
export class TokenBlacklistService {
  private blacklist = new Set<string>();

  add(token: string): void {
    this.blacklist.add(token);
  }

  isBlacklisted(token: string): boolean {
    return this.blacklist.has(token);
  }
}

// In JWT strategy
async validate(payload: JwtPayload, token: string): Promise<User> {
  if (this.blacklistService.isBlacklisted(token)) {
    throw new Error('Token has been revoked');
  }
  
  return this.usersService.findById(payload.sub);
}
```

## Comparison with Session-Based Auth

| Feature | JWT | Sessions |
|---------|-----|----------|
| Storage | Client-side | Server-side |
| Scalability | Easy (stateless) | Requires session store |
| Logout | Requires blacklist | Simple |
| Token Size | Larger | Smaller (session ID) |
| Security | Token can't be revoked easily | Can be invalidated immediately |
| Use Case | APIs, Mobile, SPAs | Traditional web apps |
