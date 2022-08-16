This directory contains configuration files for out OpenID connect MOCK server.

The mock server is used in tests to verify WorkAdventure can indeed connect to an OpenID connect
server.

The mock server is provided by https://github.com/Soluto/oidc-server-mock

You can start the environment with the mock OpenID connect server using:

```console
$ docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml up
```
