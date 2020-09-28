import { parse } from 'query-string';
import { HttpRequest } from 'uWebSockets.js';
import App from './server/app';
import SSLApp from './server/sslapp';
import { mimes, getMime } from './server/mime';
import { writeHeaders } from './server/utils';
import sendFile from './server/sendfile';
import Cluster from './server/cluster';
import livereload from './server/livereload';
import * as types from './server/types';

const getQuery = (req: HttpRequest) => {
  return parse(req.getQuery());
};

export { App, SSLApp, mimes, getMime, writeHeaders, sendFile, Cluster, livereload, getQuery };
export * from './server/types';

export default {
  App,
  SSLApp,
  mimes,
  getMime,
  writeHeaders,
  sendFile,
  Cluster,
  livereload,
  getQuery,
  ...types
};
