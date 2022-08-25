import { commonBootstrap } from './bootstrap';

async function bootstrap() {
  const app = await commonBootstrap();
  await app.listen(3001);
}

bootstrap();
