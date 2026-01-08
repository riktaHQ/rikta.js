import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Rikta',
  tagline: 'The Zero-Config TypeScript Framework for Modern Backends',
  favicon: 'img/favicon.ico',

  url: 'https://rikta.dev',
  baseUrl: '/',

  organizationName: 'riktajs',
  projectName: 'rikta',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/riktahq/rikta/tree/main/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/riktahq/rikta/tree/main/website/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/rikta-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Rikta',
      logo: {
        alt: 'Rikta Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          to: '/docs/api-reference',
          label: 'API Reference',
          position: 'left',
        },
        {
          to: '/blog',
          label: 'Blog',
          position: 'left',
        },
        {
          href: 'https://github.com/riktahq/rikta',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/overview/first-steps',
            },
            {
              label: 'Architecture',
              to: '/docs/fundamentals/dependency-injection',
            },
            {
              label: 'API Reference',
              to: '/docs/api-reference',
            },
          ],
        },
        {
          title: 'Packages',
          items: [
            {
              label: '@riktajs/core',
              to: '/docs/api-reference#core-decorators',
            },
            {
              label: '@riktajs/cli',
              to: '/docs/cli/overview',
            },
            {
              label: '@riktajs/swagger',
              to: '/docs/openapi/introduction',
            },
            {
              label: '@riktajs/typeorm',
              to: '/docs/database/typeorm',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/riktahq/rikta',
            },
            {
              label: 'NPM',
              href: 'https://www.npmjs.com/org/riktajs',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Rikta. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript'],
    },
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'rikta',
      contextualSearch: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
