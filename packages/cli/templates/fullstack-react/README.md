# My Rikta Fullstack App

A fullstack application built with Rikta and React.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
├── src/
│   ├── App.tsx           # Main React component
│   ├── App.css           # Styles
│   ├── entry-client.tsx  # Client hydration
│   ├── entry-server.tsx  # Server rendering
│   └── server.ts         # Rikta server
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run preview` - Build and preview production

## API Endpoints

- `GET /api/hello` - Example API endpoint

## Learn More

- [Rikta Documentation](https://riktajs.dev)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
