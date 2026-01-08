# @riktajs/cli

> 🛠️ CLI tool for the Rikta framework - scaffold, develop and build TypeScript backend projects.

[![npm version](https://img.shields.io/npm/v/@riktajs/cli)](https://www.npmjs.com/package/@riktajs/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- 📦 **Project Scaffolding** - Generate new Rikta projects with best practices
- 🔥 **Hot Reload** - Development server with automatic TypeScript compilation
- 🚀 **Production Build** - Optimized builds for serverless deployment
- 📊 **Build Analytics** - Size estimation and deployment suggestions

## 📥 Installation

### Global Installation (Recommended)

```bash
npm install -g @riktajs/cli
```

### Using npx (no installation required)

```bash
npx @riktajs/cli new my-app
```

### Local Development (in a project)

```bash
npm install --save-dev @riktajs/cli
```

## 🚀 Quick Start

```bash
# Create a new project
rikta new my-app

# Navigate to project
cd my-app

# Start development server
rikta dev

# Build for production
rikta build
```

## 📖 Commands

### `rikta new <project-name>`

Create a new Rikta project with a complete project structure.

```bash
rikta new my-api
```

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--template <template>` | `-t` | Project template to use | `default` |
| `--skip-install` | | Skip npm install after creation | `false` |
| `--verbose` | `-V` | Enable verbose output | `false` |

**Aliases:** `create`

**Examples:**

```bash
# Create and start immediately
rikta new my-api && cd my-api && rikta dev

# Skip npm install (faster for testing)
rikta new my-api --skip-install

# With verbose output
rikta new my-api --verbose
```

---

### `rikta dev`

Start the development server with TypeScript compilation and hot reload.

```bash
rikta dev
```

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--port <port>` | `-p` | Port to run the server on | `3000` |
| `--host <host>` | `-H` | Host to bind the server to | `0.0.0.0` |
| `--no-watch` | | Disable file watching | `false` |
| `--verbose` | `-V` | Enable verbose output | `false` |

**Aliases:** `serve`

**Features:**
- 🔄 Automatic TypeScript recompilation on file changes
- 🔃 Server restart when compilation completes
- 📝 Clear compilation error display
- 🔍 `node_modules` presence check

**Examples:**

```bash
# Default (port 3000)
rikta dev

# Custom port
rikta dev --port 8080

# Bind to localhost only
rikta dev --host 127.0.0.1

# Without watch mode (single compilation)
rikta dev --no-watch
```

---

### `rikta build`

Build the project for production or serverless deployment.

```bash
rikta build
```

**Options:**

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--outDir <dir>` | `-o` | Output directory | `dist` |
| `--minify` | | Remove comments from output | `true` |
| `--sourcemap` | | Generate source maps | `false` |
| `--clean` | | Clean output folder before build | `true` |
| `--verbose` | `-V` | Enable verbose output | `false` |

**Features:**
- 🧹 Automatic dist cleanup
- 📊 Build size estimation
- ⏱️ Build time tracking
- 📦 Deployment package suggestions
- 🔧 Support for `tsconfig.build.json`

**Examples:**

```bash
# Standard production build
rikta build

# With source maps (for debugging)
rikta build --sourcemap

# Custom output directory
rikta build --outDir build

# Keep previous build files
rikta build --no-clean

# Full verbose output
rikta build --verbose
```

---

## ⚙️ Global Options

These options work with all commands:

| Option | Alias | Description |
|--------|-------|-------------|
| `--version` | `-v` | Show CLI version |
| `--verbose` | `-V` | Enable verbose output for debugging |
| `--help` | `-h` | Show help information |

## 📁 Generated Project Structure

When you run `rikta new my-app`, the following structure is created:

```
my-app/
├── src/
│   ├── controllers/
│   │   └── app.controller.ts    # Example REST controller
│   ├── services/
│   │   └── greeting.service.ts  # Example injectable service
│   └── index.ts                 # Application entry point
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── .gitignore                   # Git ignore rules
├── .editorconfig                # Editor configuration
├── .env.example                 # Environment variables template
└── README.md                    # Project documentation
```

### Generated Files

| File | Description |
|------|-------------|
| `src/index.ts` | Main entry point with Rikta bootstrap |
| `src/controllers/app.controller.ts` | Example controller with GET endpoints |
| `src/services/greeting.service.ts` | Example service with dependency injection |
| `tsconfig.json` | Optimized TypeScript config for Rikta |
| `package.json` | Project config with npm scripts |

## 🚢 Deployment

### After Building

```bash
rikta build
```

The `dist/` folder contains the production-ready JavaScript code.

### Serverless (AWS Lambda, Vercel, Netlify)

```bash
# Create deployment package
rikta build
zip -r deploy.zip dist node_modules package.json

# Or use the CLI-suggested command shown after build
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built files
COPY dist ./dist

# Start the server
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t my-rikta-app .
docker run -p 3000:3000 my-rikta-app
```

### PM2 (Process Manager)

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-rikta-app',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

```bash
pm2 start ecosystem.config.js
```

## 🔧 Configuration

### TypeScript Configuration

The generated `tsconfig.json` is optimized for Rikta:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strict": true,
    "removeComments": true
  }
}
```

### Build-specific Configuration

Create `tsconfig.build.json` for production-specific settings:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "sourceMap": false,
    "removeComments": true
  },
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

The CLI will automatically use `tsconfig.build.json` if it exists.

## 📦 npm Scripts

The generated project includes these scripts:

```json
{
  "scripts": {
    "dev": "rikta dev",
    "build": "rikta build",
    "start": "node dist/index.js"
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please read the [contributing guidelines](../../CONTRIBUTING.md) first.

## 📄 License

[MIT](../../LICENSE)
