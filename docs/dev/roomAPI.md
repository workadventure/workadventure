# Room API

## What is that and what I can do with ?
The Room API is an API using the GRPC protocol allowing an external service to be close to a room and to perform actions such as reading/modifying/listening to a room variable or listening to events.

## Setup on self hosting
If you want to use the API on your self hosted WorkAdventure you must define the following environnement variable on your .env file :

| Variable name | Description | Example |
| ------- | -------- | -------- |
| `ROOM_API_SECRET_KEY` | `Secret key use to be authenticated by the Room API (if this key is not defined, the API will not start)` | `My AWESOME KEY` |

Start your cluster and when the starting has been finished you will be able to use the api with domain or sub directory defined on your Docker Compose file.

On local environnement, you can access to the api with the following domain : **room-api.workdventure.localhost**

## Authentication
There two way to be authenticated and it's depends if you are using a self host or the SAAS version of WorkAdventure.

If you are using the SAAS please refer to the [SAAS Room API authentication documentation](https://workadventu.re/admin-guide/room-api).

If you are using a self hosted WorkAdventure server, you have just to send the secret key defined on the **ROOM_API_SECRET_KEY** environnement variable, on the **X-API-Key** GRPC metadata on each call.

## Client libraries
  - **TypeScript / JavaScript** : [@workadventure/room-api-client](https://www.npmjs.com/package/@workadventure/room-api-client)

  You want to contribute or create a new client ? Please check the [existing clients](../../libs/room-api-clients/) before.


## Protobuf file & specification
The Protobuf file is available [here](../../messages/protos/room-api.proto).

You can also find the specification of the Protobuf file [here](roomAPI-specification.md).
