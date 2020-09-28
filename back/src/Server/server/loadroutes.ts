import { statSync, readdirSync } from 'fs';
import { join, extname } from 'path';

function loadRoutes(dir, { filter = () => true, basePath = '' } = {}) {
  let files;
  const paths = [];

  if (statSync(dir).isDirectory()) {
    files = readdirSync(dir)
      .filter(filter)
      .map(file => join(dir, file));
  } else {
    files = [dir];
  }

  files.forEach(file => {
    if (statSync(file).isDirectory()) {
      // Recursive if directory
      paths.push(...loadRoutes.call(this, file, { filter, basePath }));
    } else if (extname(file) === '.js') {
      const routes = require(file);
      let basePaths = routes.basePath || [''];
      delete routes.basePath;
      if (typeof basePaths === 'string') basePaths = [basePaths];

      basePaths.forEach(basep => {
        for (const method in routes) {
          const methodRoutes = routes[method];
          for (let r in methodRoutes) {
            if (!Array.isArray(methodRoutes[r])) methodRoutes[r] = [methodRoutes[r]];
            this[method](basePath + basep + r, ...methodRoutes[r]);
            paths.push(basePath + basep + r);
          }
        }
      });
    }
  });

  return paths;
}

export default loadRoutes;
