const path = require('path');
const fs = require('fs');

let version = '0.0.0';

if (process.env.GITHUB_REF.startsWith('refs/tags/v')) {
  version = process.env.GITHUB_REF.replace('refs/tags/v', '');
}

console.log('Version:', version);

const packageJsonPath = path.resolve(__dirname, '..', 'package.json');

let data = fs.readFileSync(packageJsonPath, 'utf8');

data = data.replace('managedbyci', version);

fs.writeFileSync(packageJsonPath, data);
