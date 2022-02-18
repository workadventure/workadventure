End-to-end tests

This directory contains automated end to end tests.

To run them locally:

```console
$ npm install
$ ADMIN_API_TOKEN=123 npm test
```

You'll need to adapt the `ADMIN_API_TOKEN` to the value you use in your `.env` file.

Alternatively, you can use docker-compose to run the tests:

```console
$ PROJECT_DIR=$(pwd) docker-compose -f docker-compose.testcafe.yml up --exit-code-from testcafe
```

Note: by default, tests are running in Chrome locally and in Chromium in the Docker image.
