import { Get, Param, Query } from '@riktajs/core';
import { SsrController, Ssr, Head } from '@riktajs/ssr';

/**
 * Page Controller - SSR-rendered pages
 *
 * All routes in this controller are rendered using SSR.
 * The return value becomes the context passed to the React component.
 */
@SsrController()
export class PageController {
  /**
   * Home page - the main landing page
   */
  @Get('/')
  @Ssr({
    title: 'Rikta SSR + React',
    description: 'A fullstack TypeScript framework with server-side rendering',
    og: {
      title: 'Rikta SSR + React',
      description: 'Build fullstack TypeScript apps with SSR support',
      type: 'website',
      image: '/og-image.png',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Rikta SSR + React',
      description: 'Build fullstack TypeScript apps with SSR support',
    },
    head: [
      Head.meta('author', 'Rikta Team'),
      Head.link('icon', '/favicon.ico'),
    ],
    cache: { maxAge: 60 },
  })
  home() {
    return {
      page: 'home',
      user: null,
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * About page
   */
  @Get('/about')
  @Ssr({
    title: 'About - Rikta SSR',
    description: 'Learn more about Rikta framework',
    robots: 'index, follow',
  })
  about() {
    return {
      page: 'about',
      features: [
        '⚡ Vite-powered builds',
        '⚛️ React 19 with SSR',
        '🚀 Fastify server',
        '🎯 TypeScript first',
        '💎 Decorator-based routing',
      ],
    };
  }

  /**
   * User profile page - dynamic route with parameter
   */
  @Get('/user/:id')
  @Ssr({
    title: 'User Profile',
    description: 'View user profile',
  })
  async userProfile(@Param('id') id: string) {
    // Simulate fetching user data
    const users: Record<string, { id: string; name: string; bio: string }> = {
      '1': { id: '1', name: 'Alice', bio: 'Software Engineer' },
      '2': { id: '2', name: 'Bob', bio: 'Product Manager' },
      '3': { id: '3', name: 'Charlie', bio: 'Designer' },
    };

    const user = users[id];

    return {
      page: 'user',
      user: user || null,
      notFound: !user,
    };
  }

  /**
   * Search results page - query parameters example
   */
  @Get('/search')
  @Ssr({
    title: 'Search Results',
    description: 'Search through our content',
  })
  search(@Query('q') query: string | undefined) {
    // Simulate search results
    const allItems = [
      { id: 1, title: 'Getting Started with Rikta', type: 'guide' },
      { id: 2, title: 'SSR Configuration', type: 'docs' },
      { id: 3, title: 'Decorator API Reference', type: 'api' },
      { id: 4, title: 'React Integration', type: 'guide' },
    ];

    const results = query
      ? allItems.filter((item) =>
          item.title.toLowerCase().includes(query.toLowerCase())
        )
      : allItems;

    return {
      page: 'search',
      query: query || '',
      results,
      total: results.length,
    };
  }
}
