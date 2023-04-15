# Developer documentation

This (work in progress) documentation provides a number of "how-to" guides explaining how to work on the WorkAdventure
code.

This documentation is targeted at developers looking to open Pull Requests on WorkAdventure.

If you "only" want to design dynamic maps, please refer instead to the [scripting API documentation](https://workadventu.re/map-building/scripting.md).

If you want to install a production server, please refer to the [install guide](../../contrib/docker/README.md).

If you want to interact with the variables or events of a room from another server, please refer to the [Room API documentation](roomAPI.md).

## Contributing

Check out the [contributing guide](../../CONTRIBUTING.md)

## Global documentation

- [WorkAdventure containers explained](communication-between-services.md)
- [Troubleshooting guide](troubleshooting.md)
- [OpenID configuration](openid.md)
- [Chat configuration](chat.md)

## Front documentation

- [How to add translations](how-to-translate.md)
- [How to add new functions in the scripting API](contributing-to-scripting-api.md)
- [About Wokas](wokas.md)

## Pusher documentation

The Pusher is exposing its HTTP API as "OpenAPI" endpoint.
You can browse this API at `http://play.workadventure.localhost/swagger-ui/`.
