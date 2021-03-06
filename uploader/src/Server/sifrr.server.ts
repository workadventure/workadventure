import { parse } from 'query-string';
import { HttpRequest } from 'uWebSockets.js';
import App from './server/app';
import SSLApp from './server/sslapp';
import * as types from './server/types';

const getQuery = (req: HttpRequest) => {
  return parse(req.getQuery());
};

export { App, SSLApp, getQuery };
export * from './server/types';

export default {
  App,
  SSLApp,
  getQuery,
  ...types
};
