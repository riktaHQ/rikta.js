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

import { Rikta } from '../src';

async function bootstrap() {
  // Create the application with auto-discovery
  // All @Controller, @Injectable, and @Provider classes are found automatically!
  const app = await Rikta.create({
    autowired: ['./src'],
    port: 3000,
    logger: false,
  });

  await app.listen();

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                    API ENDPOINTS                       ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  GET     /              Application info               ║');
  console.log('║  GET     /health        Health check                   ║');
  console.log('║  GET     /users         List all users                 ║');
  console.log('║  GET     /users/:id     Get user by ID                 ║');
  console.log('║  POST    /users         Create user                    ║');
  console.log('║  PUT     /users/:id     Update user                    ║');
  console.log('║  DELETE  /users/:id     Delete user                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('\n💡 Try: curl http://localhost:3000/health');
}

bootstrap().catch(console.error);
