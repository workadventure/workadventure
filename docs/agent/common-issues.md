# Common Issues

| Issue                                                     | Solution                                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| JavaScript heap out of memory during the Play build       | Run with `NODE_OPTIONS=--max-old-space-size=16384 npm run build` from `play/`.          |
| `Cannot find module 'ts-proto-generated'`                 | Install dependencies in `messages/`, then run `npm run ts-proto`.                       |
| Generated i18n types are missing or stale                 | Run `npm run typesafe-i18n` from `play/`.                                               |

