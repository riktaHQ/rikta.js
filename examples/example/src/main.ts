/**
 * Rikta Framework - Example Application
 *
 * A complete example demonstrating:
 * - Auto-discovery of controllers, services, and providers
 * - Configuration management with @Provider and @ConfigProperty
 * - Dependency injection with @Autowired
 * - REST API with full CRUD operations
 * - Automatic Swagger/OpenAPI documentation
 * - MCP (Model Context Protocol) server for AI assistants
 *
 * No manual provider registration needed - everything is auto-discovered!
 */

import { Rikta } from '@riktajs/core';
import { swaggerPlugin } from '@riktajs/swagger';
import { registerMCPServer } from '@riktajs/mcp';
import { APP_CONFIG } from "./config/app.config.js";

async function bootstrap() {
  // .env files are loaded automatically at the start of Rikta.create()
  // This means process.env is available immediately, even before the app is created!
  
  // Create the application with auto-discovery
  // All @Controller, @Injectable, @Provider classes are found automatically!
  const app = await Rikta.create({
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    logger: false,
  });

  const container = app.getContainer();
  const config = container.resolve<{ name: string }>(APP_CONFIG);

  // Register Swagger plugin for automatic API documentation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.server.register(swaggerPlugin as any, {
    info: {
      title: config.name || 'Rikta Example API',
      version: '1.0.0',
      description: 'Example API demonstrating Rikta Framework with automatic Swagger documentation',
    },
    config: {
      servers: [
        { url: `http://localhost:${process.env.PORT || 3000}`, description: 'Development' },
      ],
    },
  });

  // Register MCP server for AI assistant integration
  await registerMCPServer(app, {
    serverInfo: {
      name: config.name || 'rikta-example-mcp',
      version: '1.0.0',
    },
    instructions: 'This MCP server provides file system tools for listing and reading files, plus code review prompts.',
    enableSSE: true,
  });

  await app.listen();
  console.log('🚀 Rikta Example App Starting...', config.name);
  console.log(`📚 Swagger UI: http://localhost:${process.env.PORT || 3000}/docs`);
  console.log(`📋 OpenAPI JSON: http://localhost:${process.env.PORT || 3000}/docs/json`);
  console.log(`🤖 MCP Endpoint: http://localhost:${process.env.PORT || 3000}/mcp`);
}

bootstrap().catch(console.error);
