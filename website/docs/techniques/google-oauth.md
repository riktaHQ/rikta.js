# Google OAuth2 Authentication

This guide covers implementing Google OAuth2 authentication in Rikta using the `@riktajs/passport` package with the Google Strategy.

## Overview

Google OAuth2 provides secure, third-party authentication allowing users to:

- **Sign in with Google** - No need to create new passwords
- **Access user profile** - Get name, email, and avatar from Google
- **Secure authentication** - Leverage Google's security infrastructure
- **Quick setup** - Users authenticate in seconds

## Installation

```bash
npm install @riktajs/passport passport passport-google-oauth20 @types/passport-google-oauth20
```

## Google Cloud Console Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API

### 2. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in:
   - App name: Your application name
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
5. Add test users (for development)

### 3. Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/auth/google/callback`
   - Production: `https://yourdomain.com/auth/google/callback`
5. Save the **Client ID** and **Client Secret**

## Configuration

### Environment Variables

```bash
# .env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# For production
# GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

## Implementation

### 1. Register Passport Plugin

```typescript
import { Rikta } from '@riktajs/core';
import { registerPassport } from '@riktajs/passport';

async function bootstrap() {
  const app = await Rikta.create({ port: 3000 });

  // Register passport with session support
  await registerPassport(app.server, {
    secret: process.env.SESSION_SECRET!,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  });

  await app.listen();
}

bootstrap();
```

### 2. Create Google Strategy

```typescript
import { Injectable, Autowired } from '@riktajs/core';
import { PassportStrategy } from '@riktajs/passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { UsersService, User } from '../users/users.service';

@Injectable()
@PassportStrategy('google', {
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
  scope: ['email', 'profile'],
})
export class GoogleAuthStrategy {
  @Autowired()
  private usersService!: UsersService;

  /**
   * Validate Google profile and return/create user
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const { id, displayName, emails, photos } = profile;

      // Get primary email
      const email = emails?.[0]?.value;
      
      if (!email) {
        throw new Error('No email found in Google profile');
      }

      // Find or create user
      let user = await this.usersService.findByGoogleId(id);

      if (!user) {
        // Check if user exists with this email
        user = await this.usersService.findByEmail(email);

        if (user) {
          // Link Google account to existing user
          user = await this.usersService.linkGoogleAccount(user.id, id);
        } else {
          // Create new user
          user = await this.usersService.createFromGoogle({
            googleId: id,
            email,
            username: email.split('@')[0],
            displayName,
            avatar: photos?.[0]?.value,
          });
        }
      }

      done(null, user);
    } catch (error) {
      done(error as Error, undefined);
    }
  }

  /**
   * Get the underlying Passport strategy instance
   */
  getStrategy(): GoogleStrategy {
    return new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
        scope: ['email', 'profile'],
      },
      (accessToken, refreshToken, profile, done) => {
        this.validate(accessToken, refreshToken, profile, done);
      }
    );
  }
}
```

### 3. Update User Service

```typescript
import { Injectable } from '@riktajs/core';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  googleId?: string;
  createdAt: Date;
}

interface CreateFromGoogleDto {
  googleId: string;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
}

@Injectable()
export class UsersService {
  // In production, use a database
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find(u => u.email === email) || null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.users.find(u => u.googleId === googleId) || null;
  }

  async createFromGoogle(dto: CreateFromGoogleDto): Promise<User> {
    const user: User = {
      id: String(this.users.length + 1),
      username: dto.username,
      email: dto.email,
      displayName: dto.displayName,
      avatar: dto.avatar,
      googleId: dto.googleId,
      createdAt: new Date(),
    };

    this.users.push(user);
    return user;
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<User> {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    user.googleId = googleId;
    return user;
  }
}
```

### 4. Create Auth Controller

```typescript
import { Controller, Get, Req, Res, HttpCode } from '@riktajs/core';
import { Authenticated, CurrentUser } from '@riktajs/passport';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../users/users.service';

@Controller('/auth')
export class AuthController {
  /**
   * Initiate Google OAuth flow
   */
  @Get('/google')
  async googleAuth(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    // Redirect to Google OAuth consent screen
    return reply.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL!)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('email profile')}`
    );
  }

  /**
   * Google OAuth callback
   */
  @Get('/google/callback')
  async googleCallback(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    // After successful authentication, redirect to frontend
    if (request.user) {
      return reply.redirect('/dashboard');
    }
    
    // Authentication failed
    return reply.redirect('/login?error=auth_failed');
  }

  /**
   * Logout
   */
  @Post('/logout')
  @HttpCode(200)
  async logout(@Req() request: FastifyRequest) {
    await new Promise<void>((resolve) => {
      request.logOut(() => resolve());
    });
    
    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user profile
   */
  @Get('/profile')
  @Authenticated()
  getProfile(@CurrentUser() user: User) {
    return { user };
  }

  /**
   * Check authentication status
   */
  @Get('/status')
  checkStatus(@Req() request: FastifyRequest) {
    return {
      isAuthenticated: request.isAuthenticated(),
      user: request.user || null,
    };
  }
}
```

## Frontend Integration

### Login Button

```html
<!DOCTYPE html>
<html>
<head>
  <title>Login</title>
</head>
<body>
  <h1>Login</h1>
  
  <!-- Google Sign In Button -->
  <a href="/auth/google">
    <button>
      <img src="google-icon.svg" alt="Google" />
      Sign in with Google
    </button>
  </a>

  <script>
    // Check auth status on page load
    fetch('/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) {
          window.location.href = '/dashboard';
        }
      });
  </script>
</body>
</html>
```

### React Example

```tsx
import { useEffect, useState } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
}

export function LoginPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    fetch('/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.isAuthenticated) {
          setUser(data.user);
        }
      });
  }, []);

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = '/auth/google';
  };

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST' });
    setUser(null);
  };

  if (user) {
    return (
      <div>
        <h1>Welcome, {user.displayName || user.username}!</h1>
        {user.avatar && <img src={user.avatar} alt="Avatar" />}
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Login</h1>
      <button onClick={handleGoogleLogin}>
        Sign in with Google
      </button>
    </div>
  );
}
```

## Protecting Routes

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
    return {
      data: 'private',
      user: {
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    };
  }
}
```

## Advanced Configuration

### Multiple OAuth Providers

```typescript
// Google Strategy
@Injectable()
@PassportStrategy('google')
export class GoogleAuthStrategy {
  // ...
}

// GitHub Strategy
@Injectable()
@PassportStrategy('github', {
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: process.env.GITHUB_CALLBACK_URL!,
})
export class GitHubAuthStrategy {
  // ...
}

// Auth Controller
@Controller('/auth')
export class AuthController {
  @Get('/google')
  googleAuth() { /* ... */ }

  @Get('/google/callback')
  googleCallback() { /* ... */ }

  @Get('/github')
  githubAuth() { /* ... */ }

  @Get('/github/callback')
  githubCallback() { /* ... */ }
}
```

### Request Additional Scopes

```typescript
@Injectable()
@PassportStrategy('google', {
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
  scope: [
    'email',
    'profile',
    'https://www.googleapis.com/auth/calendar', // Calendar access
    'https://www.googleapis.com/auth/drive.readonly', // Read-only Drive access
  ],
})
export class GoogleAuthStrategy {
  // Store access token for API calls
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<User> {
    // Save tokens for later use
    const user = await this.usersService.findOrCreateFromGoogle(profile);
    
    await this.tokensService.saveTokens(user.id, {
      provider: 'google',
      accessToken,
      refreshToken,
    });

    return user;
  }
}
```

### Handle OAuth Errors

```typescript
@Get('/google/callback')
async googleCallback(
  @Req() request: FastifyRequest,
  @Res() reply: FastifyReply,
) {
  try {
    if (!request.user) {
      throw new Error('Authentication failed');
    }

    return reply.redirect('/dashboard?login=success');
  } catch (error) {
    console.error('OAuth error:', error);
    return reply.redirect('/login?error=auth_failed');
  }
}
```

## Best Practices

### 1. Secure Your Credentials

```typescript
// ❌ Bad - hardcoded credentials
const strategy = new GoogleStrategy({
  clientID: 'hardcoded-client-id',
  clientSecret: 'hardcoded-secret',
});

// ✅ Good - environment variables
const strategy = new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});
```

### 2. Validate Email Domain

```typescript
async validate(accessToken: string, refreshToken: string, profile: Profile) {
  const email = profile.emails?.[0]?.value;
  
  // Only allow company emails
  if (!email?.endsWith('@yourcompany.com')) {
    throw new Error('Only company emails are allowed');
  }

  return this.usersService.findOrCreateFromGoogle(profile);
}
```

### 3. Link Existing Accounts

```typescript
async validate(accessToken: string, refreshToken: string, profile: Profile) {
  const googleId = profile.id;
  const email = profile.emails?.[0]?.value!;

  // Check if user with Google ID exists
  let user = await this.usersService.findByGoogleId(googleId);

  if (!user) {
    // Check if user with email exists
    user = await this.usersService.findByEmail(email);

    if (user) {
      // Ask user to confirm account linking
      // Store pending link in session/cache
      await this.linkingService.createPendingLink(user.id, googleId);
      throw new Error('ACCOUNT_LINKING_REQUIRED');
    }

    // Create new user
    user = await this.usersService.createFromGoogle(profile);
  }

  return user;
}
```

### 4. Handle Token Refresh

```typescript
@Injectable()
export class GoogleTokenService {
  async refreshAccessToken(userId: string): Promise<string> {
    const tokens = await this.tokensService.getTokens(userId, 'google');
    
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    
    await this.tokensService.updateAccessToken(userId, 'google', data.access_token);
    
    return data.access_token;
  }
}
```

### 5. Implement CSRF Protection

```typescript
import { randomBytes } from 'crypto';

@Get('/google')
async googleAuth(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
  // Generate CSRF token
  const state = randomBytes(32).toString('hex');
  
  // Store in session
  request.session.set('oauth_state', state);

  return reply.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.GOOGLE_CALLBACK_URL!)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('email profile')}&` +
    `state=${state}` // Include state parameter
  );
}

@Get('/google/callback')
async googleCallback(@Req() request: FastifyRequest) {
  const state = request.query.state;
  const sessionState = request.session.get('oauth_state');

  // Verify state matches
  if (state !== sessionState) {
    throw new Error('Invalid state parameter');
  }

  // Continue with authentication
  // ...
}
```

## Troubleshooting

### Redirect URI Mismatch

Ensure the callback URL in your code matches exactly what's configured in Google Cloud Console:

```typescript
// Must match Google Console configuration
callbackURL: 'http://localhost:3000/auth/google/callback'
```

### Missing Email

Some Google accounts don't have a public email. Handle this case:

```typescript
async validate(accessToken: string, refreshToken: string, profile: Profile) {
  const email = profile.emails?.[0]?.value;
  
  if (!email) {
    throw new Error('Email not provided by Google');
  }

  // Continue...
}
```