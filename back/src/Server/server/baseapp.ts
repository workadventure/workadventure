import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { Readable } from 'stream';
import { us_listen_socket_close, TemplatedApp, HttpResponse, HttpRequest } from 'uWebSockets.js';
//import { watch } from 'chokidar';

import { wsConfig } from './livereload';
import sendFile from './sendfile';
import formData from './formdata';
import loadroutes from './loadroutes';
import { graphqlPost, graphqlWs } from './graphql';
import { stob } from './utils';
import { SendFileOptions, Handler } from './types';

const contTypes = ['application/x-www-form-urlencoded', 'multipart/form-data'];
const noOp = () => true;

const handleBody = (res: HttpResponse, req: HttpRequest) => {
  const contType = req.getHeader('content-type');

  res.bodyStream = function() {
    const stream = new Readable();
    stream._read = noOp;

    this.onData((ab, isLast) => {
      // uint and then slicing is bit faster than slice and then uint
      stream.push(new Uint8Array(ab.slice(ab.byteOffset, ab.byteLength)));
      if (isLast) {
        stream.push(null);
      }
    });

    return stream;
  };

  res.body = () => stob(res.bodyStream());

  if (contType.indexOf('application/json') > -1)
    res.json = async () => JSON.parse(await res.body());
  if (contTypes.map(t => contType.indexOf(t) > -1).indexOf(true) > -1)
    res.formData = formData.bind(res, contType);
};

class BaseApp {
  _staticPaths = new Map();
  //_watched = new Map();
  _sockets = new Map();
  __livereloadenabled = false;
  ws!: TemplatedApp['ws'];
  get!: TemplatedApp['get'];
  _post!: TemplatedApp['post'];
  _put!: TemplatedApp['put'];
  _patch!: TemplatedApp['patch'];
  _listen!: TemplatedApp['listen'];

  file(pattern: string, filePath: string, options: SendFileOptions = {}) {
    pattern=pattern.replace(/\\/g,'/');
    if (this._staticPaths.has(pattern)) {
      if (options.failOnDuplicateRoute)
        throw Error(
          `Error serving '${filePath}' for '${pattern}', already serving '${
            this._staticPaths.get(pattern)[0]
          }' file for this pattern.`
        );
      else if (!options.overwriteRoute) return this;
    }

    if (options.livereload && !this.__livereloadenabled) {
      this.ws('/__sifrrLiveReload', wsConfig);
      this.file('/livereload.js', join(__dirname, './livereloadjs.js'));
      this.__livereloadenabled = true;
    }

    this._staticPaths.set(pattern, [filePath, options]);
    this.get(pattern, this._serveStatic);
    return this;
  }

  folder(prefix: string, folder: string, options: SendFileOptions, base: string = folder) {
    // not a folder
    if (!statSync(folder).isDirectory()) {
      throw Error('Given path is not a directory: ' + folder);
    }

    // ensure slash in beginning and no trailing slash for prefix
    if (prefix[0] !== '/') prefix = '/' + prefix;
    if (prefix[prefix.length - 1] === '/') prefix = prefix.slice(0, -1);

    // serve folder
    const filter = options ? options.filter || noOp : noOp;
    readdirSync(folder).forEach(file => {
      // Absolute path
      const filePath = join(folder, file);
      // Return if filtered
      if (!filter(filePath)) return;

      if (statSync(filePath).isDirectory()) {
        // Recursive if directory
        this.folder(prefix, filePath, options, base);
      } else {
        this.file(prefix + '/' + relative(base, filePath), filePath, options);
      }
    });

    /*if (options && options.watch) {
      if (!this._watched.has(folder)) {
        const w = watch(folder);

        w.on('unlink', filePath => {
          const url = '/' + relative(base, filePath);
          this._staticPaths.delete(prefix + url);
        });

        w.on('add', filePath => {
          const url = '/' + relative(base, filePath);
          this.file(prefix + url, filePath, options);
        });

        this._watched.set(folder, w);
      }
    }*/
    return this;
  }

  _serveStatic(res: HttpResponse, req: HttpRequest) {
    res.onAborted(noOp);
    const options = this._staticPaths.get(req.getUrl());
    if (typeof options === 'undefined') {
      res.writeStatus('404 Not Found');
      res.end();
    } else sendFile(res, req, options[0], options[1]);
  }

  post(pattern: string, handler: Handler) {
    if (typeof handler !== 'function')
      throw Error(`handler should be a function, given ${typeof handler}.`);
    this._post(pattern, (res, req) => {
      handleBody(res, req);
      handler(res, req);
    });
    return this;
  }

  put(pattern: string, handler: Handler) {
    if (typeof handler !== 'function')
      throw Error(`handler should be a function, given ${typeof handler}.`);
    this._put(pattern, (res, req) => {
      handleBody(res, req);

      handler(res, req);
    });
    return this;
  }

  patch(pattern: string, handler: Handler) {
    if (typeof handler !== 'function')
      throw Error(`handler should be a function, given ${typeof handler}.`);
    this._patch(pattern, (res, req) => {
      handleBody(res, req);

      handler(res, req);
    });
    return this;
  }

  graphql(route: string, schema, graphqlOptions: any = {}, uwsOptions = {}, graphql) {
    const handler = graphqlPost(schema, graphqlOptions, graphql);
    this.post(route, handler);
    this.ws(route, graphqlWs(schema, graphqlOptions, uwsOptions, graphql));
    // this.get(route, handler);
    if (graphqlOptions && graphqlOptions.graphiqlPath)
      this.file(graphqlOptions.graphiqlPath, join(__dirname, './graphiql.html'));
    return this;
  }

  load(dir: string, options) {
    loadroutes.call(this, dir, options);
    return this;
  }

  listen(h: string | number, p: Function | number = noOp, cb?: Function) {
    if (typeof p === 'number' && typeof h === 'string') {
      this._listen(h, p, socket => {
        this._sockets.set(p, socket);
        if (cb === undefined) {
          throw new Error('cb undefined');
        }
        cb(socket);
      });
    } else if (typeof h === 'number' && typeof p === 'function') {
      this._listen(h, socket => {
        this._sockets.set(h, socket);
        p(socket);
      });
    } else {
      throw Error(
        'Argument types: (host: string, port: number, cb?: Function) | (port: number, cb?: Function)'
      );
    }

    return this;
  }

  close(port: null | number = null) {
    //this._watched.forEach(v => v.close());
    //this._watched.clear();
    if (port) {
      this._sockets.has(port) && us_listen_socket_close(this._sockets.get(port));
      this._sockets.delete(port);
    } else {
      this._sockets.forEach(app => {
        us_listen_socket_close(app);
      });
      this._sockets.clear();
    }
    return this;
  }
}

export default BaseApp;
