---
title: SSR Decorators
sidebar_label: Decorators
description: Learn about @SsrController and @Ssr decorators
---

# SSR Decorators

Rikta provides decorators to define SSR routes and configure page metadata in a declarative way.

## @SsrController()

Marks a class as an SSR controller and optionally sets a route prefix.

### Basic Usage

```typescript
import { SsrController, Get, Ssr } from '@riktajs/ssr';

@SsrController()
export class PageController {
  @Get('/')
  @Ssr({ title: 'Home' })
  home() {
    return { page: 'home' };
  }
}
```

### With Route Prefix

```typescript
@SsrController('/pages')
export class PageController {
  @Get('/home')    // Matches /pages/home
  @Ssr({ title: 'Home' })
  home() {
    return { page: 'home' };
  }

  @Get('/about')   // Matches /pages/about
  @Ssr({ title: 'About' })
  about() {
    return { page: 'about' };
  }
}
```

## @Ssr()

Configures SSR metadata and options for a route handler.

### Title and Description

```typescript
@Get('/about')
@Ssr({
  title: 'About Us',
  description: 'Learn more about our company and mission',
})
about() {
  return { page: 'about' };
}
```

### Open Graph Tags

```typescript
@Get('/blog/:slug')
@Ssr({
  title: 'Blog Post',
  og: {
    title: 'Amazing Blog Post',
    description: 'Read our latest insights',
    image: 'https://example.com/og-image.png',
    type: 'article',
    url: 'https://example.com/blog/post',
  }
})
getBlogPost(@Param('slug') slug: string) {
  const post = this.findPost(slug);
  return { post };
}
```

### Twitter Card Tags

```typescript
@Get('/product/:id')
@Ssr({
  title: 'Product Details',
  twitter: {
    card: 'summary_large_image',
    site: '@mycompany',
    creator: '@author',
    title: 'Amazing Product',
    description: 'Check out this product',
    image: 'https://example.com/product.png',
  }
})
getProduct(@Param('id') id: string) {
  const product = this.findProduct(id);
  return { product };
}
```

### Canonical URL

```typescript
@Get('/page')
@Ssr({
  title: 'My Page',
  canonical: 'https://example.com/page',
})
page() {
  return { page: 'content' };
}
```

### Robots Directive

```typescript
@Get('/private')
@Ssr({
  title: 'Private Page',
  robots: 'noindex, nofollow',
})
privatePage() {
  return { page: 'private' };
}
```

### Custom Head Tags

```typescript
@Get('/custom')
@Ssr({
  title: 'Custom Page',
  head: [
    {
      tag: 'link',
      attrs: {
        rel: 'preload',
        href: '/fonts/custom.woff2',
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
    },
    {
      tag: 'script',
      attrs: {
        src: 'https://analytics.example.com/script.js',
        async: true,
      },
    },
  ],
})
customPage() {
  return { page: 'custom' };
}
```

### Cache Control

Define cache settings (note: you need to implement the Cache-Control header manually in your entry-server or middleware):

```typescript
@Get('/cached-page')
@Ssr({
  title: 'Cached Page',
  cache: {
    maxAge: 60,                 // Cache for 60 seconds
    staleWhileRevalidate: 120,  // Serve stale for 120s while revalidating
  }
})
cachedPage() {
  return { page: 'cached' };
}
```

The cache options are available in the SSR metadata but are not automatically applied as HTTP headers.

## Complete Example

```typescript title="src/controllers/page.controller.ts"
import { SsrController, Ssr, Get, Param, Query } from '@riktajs/ssr';
import { Injectable } from '@riktajs/core';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  author: string;
  publishedAt: Date;
}

@Injectable()
@SsrController('/blog')
export class BlogController {
  @Get('/')
  @Ssr({
    title: 'Blog - My Site',
    description: 'Read our latest articles and insights',
    og: {
      title: 'My Blog',
      image: 'https://example.com/blog-og.png',
      type: 'website',
    },
    cache: {
      maxAge: 300, // Cache for 5 minutes
    }
  })
  listPosts(@Query('page') page: string = '1') {
    const posts = this.getPosts(parseInt(page));
    return {
      posts,
      pagination: {
        page: parseInt(page),
        total: this.getTotalPages(),
      }
    };
  }

  @Get('/:slug')
  @Ssr({
    title: 'Blog Post',
    og: {
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@mysite',
    },
    cache: {
      maxAge: 600,
      staleWhileRevalidate: 1200,
    }
  })
  getPost(@Param('slug') slug: string) {
    const post = this.findPostBySlug(slug);
    
    if (!post) {
      throw new Error('Post not found');
    }

    return {
      post,
      relatedPosts: this.getRelatedPosts(post.id),
    };
  }

  private getPosts(page: number): BlogPost[] {
    // Implementation
    return [];
  }

  private getTotalPages(): number {
    // Implementation
    return 10;
  }

  private findPostBySlug(slug: string): BlogPost | null {
    // Implementation
    return null;
  }

  private getRelatedPosts(postId: string): BlogPost[] {
    // Implementation
    return [];
  }
}
```

## Dynamic Metadata

You can also generate metadata dynamically. The @Ssr decorator options take precedence, but you can return dynamic data:

```typescript
@Get('/user/:id')
@Ssr({
  title: 'User Profile', // This title is used from decorator
})
getUserProfile(@Param('id') id: string) {
  const user = this.findUser(id);
  
  // Return data - it will be available in context.__SSR_DATA__
  return {
    user,
  };
}
```

For fully dynamic metadata, you can override in your `entry-server.tsx`:

```tsx
export function render(url: string, context: Record<string, unknown> = {}) {
  // Extract metadata from context (set by @Ssr decorator)
  const { title: contextTitle, description: contextDescription, __SSR_DATA__, ...restContext } = context;
  
  // You can override title/description based on the data
  const userData = __SSR_DATA__ as { user?: { name: string; avatar: string } };
  const dynamicTitle = userData?.user?.name 
    ? `${userData.user.name} - User Profile` 
    : (contextTitle as string || 'User Profile');
  
  const ssrData: SsrData = {
    data: __SSR_DATA__ ?? restContext,
    url,
    title: dynamicTitle,
    description: contextDescription as string,
  };

  // Render app
  const html = renderToString(
    <RiktaProvider ssrData={ssrData}>
      <App />
    </RiktaProvider>
  );
  
  // Build head with dynamic data
  const head = new HeadBuilder();
  head.title(dynamicTitle);
  
  if (contextDescription) {
    head.description(contextDescription as string);
  }
  
  // Add custom og tags based on user data
  if (userData?.user) {
    head.og({
      title: userData.user.name,
      image: userData.user.avatar,
      type: 'profile',
    });
  }
  
  head.withSsrData(ssrData as unknown as Record<string, unknown>);
  
  return {
    html,
    title: head.getTitle(),
    head: head.build(),
  };
}
```

## API Reference

### @SsrController Options

```typescript
@SsrController(prefix?: string)
```

- `prefix` - Optional route prefix for all routes in the controller

### @Ssr Options

```typescript
interface SsrRouteOptions {
  /** Page title */
  title?: string;
  
  /** Meta description */
  description?: string;
  
  /** Open Graph tags */
  og?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
    url?: string;
    siteName?: string;

  };
  
  /** Twitter Card tags */
  twitter?: {
    card?: 'summary' | 'summary_large_image' | 'app' | 'player';
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  
  /** Canonical URL */
  canonical?: string;
  
  /** Robots meta tag */
  robots?: string;
  
  /** Custom head tags */
  head?: Array<{
    tag: string;
    attrs?: Record<string, string>;
    children?: string;
  }>;
  
  /** HTTP cache control */
  cache?: {
    maxAge?: number;
    staleWhileRevalidate?: number;
  };
}
```