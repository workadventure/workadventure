End-to-end tests

This directory contains automated end to end tests.

To run them locally:

```console
$ npm install
$ npm test
```

Alternatively, you can use docker-compose to run the tests:

```console
$ docker-compose -f docker-compose.testcafe.yml up --exit-code-from testcafe
```

Note: by default, tests are running in Chrome locally and in Chromium in the Docker image.
