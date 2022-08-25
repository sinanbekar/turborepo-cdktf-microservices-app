import { configure as serverlessExpress } from '@vendia/serverless-express';
import type { Callback, Context, Handler } from 'aws-lambda';
import { commonBootstrap } from './bootstrap';

let server: Handler;

async function bootstrap(): Promise<Handler> {
  const app = await commonBootstrap();
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({
    app: expressApp,
    binarySettings: {
      contentTypes: ['application/pdf'],
    },
  });
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  server = server ?? (await bootstrap());
  return server(event, context, callback);
};
