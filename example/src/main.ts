/**
 * Rikta Framework - Example Application
 * 
 * A complete example demonstrating:
 * - Auto-discovery of controllers, services, and providers
 * - @Provider decorator for custom providers
 * - Dependency injection with @Autowired
 * - REST API with full CRUD operations
 * 
 * No manual provider registration needed - everything is auto-discovered!
 */

import { Rikta } from '@riktajs/core';

async function bootstrap() {
  // Create the application with auto-discovery
  // All @Controller, @Injectable, and @Provider classes are found automatically!
  const app = await Rikta.create({
    autowired: [__dirname],
    port: 3000,
    logger: false,
  });

  await app.listen();
}

bootstrap().catch(console.error);
