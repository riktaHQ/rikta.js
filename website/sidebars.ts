import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'introduction',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Overview',
      collapsed: false,
      items: [
        'overview/first-steps',
        'overview/controllers',
        'overview/providers',
        'overview/modules',
      ],
    },
    {
      type: 'category',
      label: 'Fundamentals',
      items: [
        'fundamentals/dependency-injection',
        'fundamentals/configuration',
        'fundamentals/lifecycle-events',
        'fundamentals/testing',
      ],
    },
    {
      type: 'category',
      label: 'Techniques',
      items: [
        'techniques/validation',
        'techniques/error-handling',
        'techniques/guards',
        'techniques/logging',
        'techniques/queues'
      ],
    },
    {
      type: 'category',
      label: 'Database',
      items: [
        'database/typeorm',
      ],
    },
    {
      type: 'category',
      label: 'OpenAPI',
      items: [
        'openapi/introduction',
        'openapi/decorators',
        'openapi/operations',
      ],
    },
    {
      type: 'category',
      label: 'CLI',
      items: [
        'cli/overview',
        'cli/commands'
      ],
    },
    {
      type: 'category',
      label: 'FAQ',
      items: [
        'faq/common-questions',
      ],
    },
    {
      type: 'doc',
      id: 'benchmarks',
      label: 'Benchmarks',
    },
    {
      type: 'doc',
      id: 'api-reference',
      label: 'API Reference',
    },
    {
      type: 'link',
      label: 'Support Us',
      href: 'https://github.com/sponsors/riktajs',
    },
  ],
};

export default sidebars;
