import { Rikta } from '@riktajs/core';

async function bootstrap(): Promise<void> {
  const app = await Rikta.create();

  await app.listen();
}

bootstrap().catch(console.error);