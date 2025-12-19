# 🛣️ Router

HTTP routing powered by Fastify.

## How It Works

1. Controllers with `@Controller` are auto-discovered
2. Methods with `@Get`, `@Post`, etc. become routes
3. Parameters are resolved via decorators

```typescript
@Controller('/users')      // prefix: /users
export class UserController {
  @Get('/:id')             // GET /users/:id
  findOne(@Param('id') id: string) {
    return { id };
  }
}
```

## Route Registration

Routes are built from:
```
Global prefix + Controller prefix + Route path

/api/v1 + /users + /:id = /api/v1/users/:id
```

## Parameter Resolution

| Decorator | Source |
|-----------|--------|
| `@Body()` | Request body |
| `@Param('id')` | Route param |
| `@Query('page')` | Query string |
| `@Headers('auth')` | Header value |
| `@Req()` | Full request |
| `@Res()` | Full reply |

## Response Handling

### Automatic JSON

Return values are serialized automatically:

```typescript
@Get()
findAll() {
  return [{ id: 1 }, { id: 2 }];
  // Response: [{"id":1},{"id":2}]
}
```

### Status Codes

```typescript
@Post()
@HttpCode(201)
create() {
  return { created: true };
}

@Delete('/:id')
@HttpCode(204)
remove() {
  // No content
}
```

### Raw Response

```typescript
@Get('/download')
download(@Res() reply: FastifyReply) {
  reply.header('Content-Type', 'application/pdf');
  reply.send(pdfBuffer);
}
```

## Path Patterns

```typescript
@Get('/users')                        // Static
@Get('/users/:id')                    // Dynamic param
@Get('/users/:userId/posts/:postId')  // Multiple params
@Get('/files/*')                      // Wildcard
```

## Fastify Access

```typescript
const app = await Rikta.create({ port: 3000 });

// Get Fastify instance
const fastify = app.server;

// Register plugins
fastify.register(cors);
fastify.register(helmet);

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  reply.status(500).send({ error: error.message });
});
```
