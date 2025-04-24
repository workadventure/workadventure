/**
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.ts': ['npm run lint:fix', 'git add .'],
};
