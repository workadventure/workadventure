This directory contains configuration files for our OpenID connect MOCK server.

The mock server is used in tests to verify WorkAdventure can indeed connect to an OpenID connect
server.

The mock server is provided by https://github.com/Soluto/oidc-server-mock

The OIDC mock server is now enabled by default when you start the environment:

```console
$ docker-compose up
```

If you want to disable the OIDC mock server (for anonymous access), you can run:

```console
$ docker-compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml up
```
