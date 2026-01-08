import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          🧭 {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className={styles.heroDescription}>
          Build scalable APIs with the power of Fastify and the elegance of decorators.
          <br />
          No modules. No boilerplate. Just code.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/overview/first-steps">
            Get Started
          </Link>
          <Link
            className="button button--outline button--lg"
            to="/docs">
            Learn More
          </Link>
        </div>

        {/* Quick Start Terminal */}
        <div className={styles.terminalWrapper}>
          <div className={styles.terminalHeader}>
            <div className={styles.terminalButtons}>
              <span className={styles.terminalButtonRed}></span>
              <span className={styles.terminalButtonYellow}></span>
              <span className={styles.terminalButtonGreen}></span>
            </div>
            <div className={styles.terminalTitle}>⚡ Quick Start</div>
          </div>
          <pre className={styles.terminal}>
            <code dangerouslySetInnerHTML={{
              __html: `<span style="color: #9ece6a;">npx</span> <span style="color: #bb9af7;">@riktajs/cli</span> <span style="color: #7dcfff;">new</span> my-app` }} />
          </pre>
        </div>
      </div>
    </header>
  );
}

type FeatureItem = {
  title: string;
  emoji: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Zero-Config Autowiring',
    emoji: '🚀',
    description: (
      <>
        No <code>imports: []</code>, <code>exports: []</code>, or <code>providers: []</code> arrays.
        Just decorate your class, and it works. Say goodbye to "Module Hell".
      </>
    ),
  },
  {
    title: 'Fastify Powered',
    emoji: '⚡',
    description: (
      <>
        Built on top of Fastify for maximum performance and low overhead.
        Rikta is <strong>32% faster</strong> than NestJS on average.
      </>
    ),
  },
  {
    title: 'Type-Safe by Default',
    emoji: '🛡️',
    description: (
      <>
        Native Zod integration for validation that infers your TypeScript types automatically.
        Define once, validate everywhere.
      </>
    ),
  },
  {
    title: 'Powerful DI Container',
    emoji: '🔌',
    description: (
      <>
        Support for Singleton and Transient scopes, factory providers, value tokens,
        and property injection with <code>@Autowired()</code>.
      </>
    ),
  },
  {
    title: 'Hybrid Lifecycle',
    emoji: '🔄',
    description: (
      <>
        Powerful hooks (<code>OnProviderInit</code>, <code>OnApplicationListen</code>)
        and an event bus for complex application flows.
      </>
    ),
  },
  {
    title: 'CLI Tooling',
    emoji: '🛠️',
    description: (
      <>
        Get up and running in seconds with <code>npx @riktajs/cli new my-app</code>.
        Includes dev server with hot reload and production builds.
      </>
    ),
  },
];

function Feature({ title, emoji, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md" style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{emoji}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PackagesSection(): JSX.Element {
  const packages = [
    { name: '@riktajs/core', desc: 'Core framework with DI, routing, and validation', link: '/docs/api-reference' },
    { name: '@riktajs/cli', desc: 'CLI for scaffolding and development', link: '/docs/cli/overview' },
    { name: '@riktajs/swagger', desc: 'OpenAPI/Swagger documentation', link: '/docs/openapi/introduction' },
    { name: '@riktajs/typeorm', desc: 'TypeORM integration', link: '/docs/database/typeorm' },
  ];

  return (
    <section className={styles.packages}>
      <div className="container">
        <Heading as="h2" className="text--center" style={{ marginBottom: '2rem' }}>
          📦 Packages
        </Heading>
        <div className="row">
          {packages.map((pkg) => (
            <div className="col col--3" key={pkg.name}>
              <Link to={pkg.link} className={styles.packageCard}>
                <Heading as="h4">{pkg.name}</Heading>
                <p>{pkg.desc}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} - ${siteConfig.tagline}`}
      description="The Zero-Config TypeScript Framework for Modern Backends. Build scalable APIs with Fastify and decorators.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <PackagesSection />
      </main>
    </Layout>
  );
}
