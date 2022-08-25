import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

export async function commonBootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api');
  return app;
}
