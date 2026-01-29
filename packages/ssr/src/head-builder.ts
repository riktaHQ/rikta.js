import type { HeadTag, SsrRouteOptions } from './decorators/ssr.decorator.js';

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render a single head tag to HTML string
 */
function renderTag(tag: HeadTag): string {
  const { tag: tagName, attrs, children } = tag;
  
  const attrStr = Object.entries(attrs)
    .map(([key, value]) => {
      if (value === true) return key;
      if (value === false) return '';
      return `${key}="${escapeHtml(String(value))}"`;
    })
    .filter(Boolean)
    .join(' ');

  // Self-closing tags
  const selfClosing = ['meta', 'link', 'base', 'br', 'hr', 'img', 'input'];
  
  if (selfClosing.includes(tagName)) {
    return `<${tagName}${attrStr ? ' ' + attrStr : ''} />`;
  }

  return `<${tagName}${attrStr ? ' ' + attrStr : ''}>${children || ''}</${tagName}>`;
}

/**
 * HeadBuilder - Fluent API for building head tags
 * 
 * @example
 * ```typescript
 * const head = new HeadBuilder()
 *   .title('My Page')
 *   .description('Page description')
 *   .og({ title: 'OG Title', image: '/og.png' })
 *   .canonical('https://example.com/page')
 *   .meta('author', 'John Doe')
 *   .link('icon', '/favicon.ico')
 *   .build();
 * ```
 */
export class HeadBuilder {
  private tags: HeadTag[] = [];
  private pageTitle = '';
  private ssrData: Record<string, unknown> = {};

  /**
   * Set page title
   */
  title(value: string): this {
    this.pageTitle = value;
    return this;
  }

  /**
   * Set meta description
   */
  description(value: string): this {
    this.tags.push({ tag: 'meta', attrs: { name: 'description', content: value } });
    return this;
  }

  /**
   * Add Open Graph tags
   */
  og(options: SsrRouteOptions['og']): this {
    if (!options) return this;
    
    if (options.title) {
      this.tags.push({ tag: 'meta', attrs: { property: 'og:title', content: options.title } });
    }
    if (options.description) {
      this.tags.push({ tag: 'meta', attrs: { property: 'og:description', content: options.description } });
    }
    if (options.image) {
      this.tags.push({ tag: 'meta', attrs: { property: 'og:image', content: options.image } });
    }
    if (options.url) {
      this.tags.push({ tag: 'meta', attrs: { property: 'og:url', content: options.url } });
    }
    if (options.type) {
      this.tags.push({ tag: 'meta', attrs: { property: 'og:type', content: options.type } });
    }
    if (options.siteName) {
      this.tags.push({ tag: 'meta', attrs: { property: 'og:site_name', content: options.siteName } });
    }
    
    return this;
  }

  /**
   * Add Twitter Card tags
   */
  twitter(options: SsrRouteOptions['twitter']): this {
    if (!options) return this;
    
    if (options.card) {
      this.tags.push({ tag: 'meta', attrs: { name: 'twitter:card', content: options.card } });
    }
    if (options.site) {
      this.tags.push({ tag: 'meta', attrs: { name: 'twitter:site', content: options.site } });
    }
    if (options.creator) {
      this.tags.push({ tag: 'meta', attrs: { name: 'twitter:creator', content: options.creator } });
    }
    if (options.title) {
      this.tags.push({ tag: 'meta', attrs: { name: 'twitter:title', content: options.title } });
    }
    if (options.description) {
      this.tags.push({ tag: 'meta', attrs: { name: 'twitter:description', content: options.description } });
    }
    if (options.image) {
      this.tags.push({ tag: 'meta', attrs: { name: 'twitter:image', content: options.image } });
    }
    
    return this;
  }

  /**
   * Set canonical URL
   */
  canonical(url: string): this {
    this.tags.push({ tag: 'link', attrs: { rel: 'canonical', href: url } });
    return this;
  }

  /**
   * Set robots directive
   */
  robots(value: string): this {
    this.tags.push({ tag: 'meta', attrs: { name: 'robots', content: value } });
    return this;
  }

  /**
   * Add a meta tag
   */
  meta(name: string, content: string): this {
    this.tags.push({ tag: 'meta', attrs: { name, content } });
    return this;
  }

  /**
   * Add a meta property tag (for Open Graph, etc.)
   */
  metaProperty(property: string, content: string): this {
    this.tags.push({ tag: 'meta', attrs: { property, content } });
    return this;
  }

  /**
   * Add a link tag
   */
  link(rel: string, href: string, attrs: Record<string, string> = {}): this {
    this.tags.push({ tag: 'link', attrs: { rel, href, ...attrs } });
    return this;
  }

  /**
   * Add a script tag
   */
  script(attrs: Record<string, string | boolean>, content?: string): this {
    this.tags.push({ tag: 'script', attrs, children: content });
    return this;
  }

  /**
   * Add JSON-LD structured data
   */
  jsonLd(data: Record<string, unknown>): this {
    this.tags.push({
      tag: 'script',
      attrs: { type: 'application/ld+json' },
      children: JSON.stringify(data),
    });
    return this;
  }

  /**
   * Add SSR data for client hydration
   */
  withSsrData(data: Record<string, unknown>): this {
    this.ssrData = data;
    return this;
  }

  /**
   * Add custom head tags
   */
  addTags(tags: HeadTag[]): this {
    this.tags.push(...tags);
    return this;
  }

  /**
   * Add a custom tag
   */
  addTag(tag: HeadTag): this {
    this.tags.push(tag);
    return this;
  }

  /**
   * Get the page title
   */
  getTitle(): string {
    return this.pageTitle;
  }

  /**
   * Build the head HTML string
   */
  build(): string {
    const lines: string[] = [];

    // Render all tags
    for (const tag of this.tags) {
      lines.push(renderTag(tag));
    }

    // Add SSR data script if present
    if (Object.keys(this.ssrData).length > 0) {
      const serializedData = JSON.stringify(this.ssrData)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/'/g, '\\u0027');
      
      lines.push(`<script>window.__SSR_DATA__ = ${serializedData};</script>`);
    }

    return lines.join('\n');
  }
}

/**
 * Create a HeadBuilder from SsrRouteOptions
 * 
 * @example
 * ```typescript
 * const { title, head } = buildHead({
 *   title: 'My Page',
 *   description: 'Page description',
 *   og: { title: 'OG Title', image: '/og.png' },
 *   canonical: 'https://example.com/page',
 * }, ssrData);
 * ```
 */
export function buildHead(
  options: SsrRouteOptions,
  ssrData: Record<string, unknown> = {}
): { title: string; head: string } {
  const builder = new HeadBuilder();

  if (options.title) {
    builder.title(options.title);
  }

  if (options.description) {
    builder.description(options.description);
  }

  if (options.og) {
    builder.og(options.og);
  }

  if (options.twitter) {
    builder.twitter(options.twitter);
  }

  if (options.canonical) {
    builder.canonical(options.canonical);
  }

  if (options.robots) {
    builder.robots(options.robots);
  }

  if (options.head) {
    builder.addTags(options.head);
  }

  if (Object.keys(ssrData).length > 0) {
    builder.withSsrData(ssrData);
  }

  return {
    title: builder.getTitle(),
    head: builder.build(),
  };
}

/**
 * Shorthand helper functions for common head operations
 */
export const Head = {
  /**
   * Create a meta tag
   */
  meta: (name: string, content: string): HeadTag => ({
    tag: 'meta',
    attrs: { name, content },
  }),

  /**
   * Create a meta property tag
   */
  property: (property: string, content: string): HeadTag => ({
    tag: 'meta',
    attrs: { property, content },
  }),

  /**
   * Create a link tag
   */
  link: (rel: string, href: string, attrs: Record<string, string> = {}): HeadTag => ({
    tag: 'link',
    attrs: { rel, href, ...attrs },
  }),

  /**
   * Create a script tag
   */
  script: (attrs: Record<string, string | boolean>, content?: string): HeadTag => ({
    tag: 'script',
    attrs,
    children: content,
  }),

  /**
   * Create JSON-LD structured data tag
   */
  jsonLd: (data: Record<string, unknown>): HeadTag => ({
    tag: 'script',
    attrs: { type: 'application/ld+json' },
    children: JSON.stringify(data),
  }),

  /**
   * Create a preload link
   */
  preload: (href: string, as: string, attrs: Record<string, string> = {}): HeadTag => ({
    tag: 'link',
    attrs: { rel: 'preload', href, as, ...attrs },
  }),

  /**
   * Create a preconnect link
   */
  preconnect: (href: string, crossorigin = false): HeadTag => ({
    tag: 'link',
    attrs: crossorigin
      ? { rel: 'preconnect', href, crossorigin: 'anonymous' }
      : { rel: 'preconnect', href },
  }),

  /**
   * Create a favicon link
   */
  favicon: (href: string, type = 'image/x-icon'): HeadTag => ({
    tag: 'link',
    attrs: { rel: 'icon', href, type },
  }),

  /**
   * Create an Apple touch icon link
   */
  appleTouchIcon: (href: string, sizes?: string): HeadTag => ({
    tag: 'link',
    attrs: sizes
      ? { rel: 'apple-touch-icon', href, sizes }
      : { rel: 'apple-touch-icon', href },
  }),
};
