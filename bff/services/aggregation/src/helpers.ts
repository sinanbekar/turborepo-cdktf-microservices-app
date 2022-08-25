import type { Request } from 'express';

export const getCsvToPdfServiceUrl = (req: Request, event: any) => {
  const url = new URL(
    `${req.protocol}://${event.headers?.Host ?? req.get('Host')}`,
  );
  if (event.requestContext?.stage) {
    url.pathname = event.requestContext.stage + '/';
  }
  url.pathname += 'api/csv2pdf/'; // TODO: dynamic
  return url;
};
