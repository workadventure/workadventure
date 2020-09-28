import { AppOptions, TemplatedApp, HttpResponse, HttpRequest } from 'uWebSockets.js';

export type UwsApp = {
  (options: AppOptions): TemplatedApp;
  new (options: AppOptions): TemplatedApp;
  prototype: TemplatedApp;
};

export type SendFileOptions = {
  failOnDuplicateRoute?: boolean;
  overwriteRoute?: boolean;
  watch?: boolean;
  filter?: (path: string) => boolean;
  livereload?: boolean;
  lastModified?: boolean;
  headers?: { [name: string]: string };
  compress?: boolean;
  compressionOptions?: {
    priority?: 'gzip' | 'br' | 'deflate';
  };
  cache?: boolean;
};

export type Handler = (res: HttpResponse, req: HttpRequest) => void;

export {};
