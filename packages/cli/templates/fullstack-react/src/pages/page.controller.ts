import { Get, Param } from '@riktajs/core';
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

  /**
   * Item detail page - Dynamic route with parameter
   */
  @Get('/item/:id')
  @Ssr({
    title: 'Item Details',
    description: 'View item details',
  })
  itemDetail(@Param('id') id: string) {
    // Simulate fetching data from database
    const items: Record<string, { id: string; title: string; description: string; price: number; category: string }> = {
      '1': { 
        id: '1', 
        title: 'Wireless Headphones', 
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
        price: 299.99,
        category: 'Electronics'
      },
      '2': { 
        id: '2', 
        title: 'Smart Watch', 
        description: 'Advanced fitness tracker with heart rate monitoring and GPS.',
        price: 399.99,
        category: 'Wearables'
      },
      '3': { 
        id: '3', 
        title: 'Laptop Stand', 
        description: 'Ergonomic aluminum laptop stand with adjustable height.',
        price: 49.99,
        category: 'Accessories'
      },
    };

    const item = items[id];

    return {
      page: 'item',
      item: item || null,
      notFound: !item,
    };
  }
}
