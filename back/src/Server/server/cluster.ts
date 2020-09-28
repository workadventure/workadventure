const noop = (a, b) => {};

export default class Cluster {
  apps: any[];
  listens = {};
  // apps = [ { app: SifrrServerApp, port/ports: int } ]
  constructor(apps) {
    if (!Array.isArray(apps)) apps = [apps];
    this.apps = apps;
  }

  listen(onListen = noop) {
    for (let i = 0; i < this.apps.length; i++) {
      const config = this.apps[i];
      let { app, port, ports } = config;
      if (!Array.isArray(ports) || ports.length === 0) {
        ports = [port];
      }
      ports.forEach(p => {
        if (typeof p !== 'number') throw Error(`Port should be a number, given ${p}`);
        if (this.listens[p]) return;

        app.listen(p, socket => {
          onListen.call(app, socket, p);
        });
        this.listens[p] = app;
      });
    }
    return this;
  }

  closeAll() {
    Object.keys(this.listens).forEach(port => {
      this.close(port);
    });
    return this;
  }

  close(port = null) {
    if (port) {
      this.listens[port] && this.listens[port].close(port);
      delete this.listens[port];
    } else {
      this.closeAll();
    }
    return this;
  }
}
