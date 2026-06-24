# Common Issues

| Issue | Solution |
|-------|----------|
| JavaScript heap out of memory | `export NODE_OPTIONS=--max-old-space-size=16384` |
| Port conflicts | `docker-compose down` or kill processes on ports 3000, 3001, 8080 |
