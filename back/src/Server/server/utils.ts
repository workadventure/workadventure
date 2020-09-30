import { ReadStream } from 'fs';

function extend(who: any, from: any, overwrite = true) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const ownProps = Object.getOwnPropertyNames(Object.getPrototypeOf(from)).concat(
    Object.keys(from)
  );
  ownProps.forEach(prop => {
    if (prop === 'constructor' || from[prop] === undefined) return;
    if (who[prop] && overwrite) {
      who[`_${prop}`] = who[prop];
    }
    if (typeof from[prop] === 'function') who[prop] = from[prop].bind(who);
    else who[prop] = from[prop];
  });
}

function stob(stream: ReadStream): Promise<Buffer> {
  return new Promise(resolve => {
    const buffers: Buffer[] = [];
    stream.on('data', buffers.push.bind(buffers));

    stream.on('end', () => {
      switch (buffers.length) {
        case 0:
          resolve(Buffer.allocUnsafe(0));
          break;
        case 1:
          resolve(buffers[0]);
          break;
        default:
          resolve(Buffer.concat(buffers));
      }
    });
  });
}

export { extend, stob };
