/**
 * Rikta Framework - Example Application
 *
 * A complete example demonstrating:
 * - Auto-discovery of controllers, services, and providers
 * - Configuration management with @Provider and @ConfigProperty
 * - Dependency injection with @Autowired
 * - REST API with full CRUD operations
 *
 * No manual provider registration needed - everything is auto-discovered!
 */

import { Rikta } from '@riktajs/core';
import {APP_CONFIG} from "./config/app.config";

async function bootstrap() {
  // Create the application with auto-discovery
  // All @Controller, @Injectable, @Provider classes are found automatically!
  const app = await Rikta.create({
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    logger: false,
  });

  const container = app.getContainer();
  const config = container.resolve(APP_CONFIG)

  await app.listen();
  console.log('🚀 Rikta Example App Starting...', config.name);
}

bootstrap().catch(console.error);
