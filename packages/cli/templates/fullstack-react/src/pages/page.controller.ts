import { Get } from '@riktajs/core';
import { SsrController, Ssr, Head } from '@riktajs/ssr';

/**
 * Page Controller - SSR-rendered pages
 *
 * Use @SsrController() to mark a class as an SSR controller.
 * The return value of each method becomes the context passed to React.
 */
@SsrController()
export class PageController {
  /**
   * Home page
   */
  @Get('/')
  @Ssr({
    title: 'Welcome to Rikta',
    description: 'A fullstack TypeScript framework with SSR',
    og: {
      title: 'Welcome to Rikta',
      description: 'Build fullstack TypeScript apps with ease',
      type: 'website',
    },
    head: [
      Head.meta('author', 'Your Name'),
    ],
  })
  home() {
    return {
      page: 'home',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    };
  }
}
