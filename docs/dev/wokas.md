# About Wokas

Wokas are made of a set of layers (for custom wokas), or of only 1 layers (if selected from the first screen)

Internally, each layer has:

- a name
- a URL

## Connection to a map

When a user connects to a map, it sends, as a web-socket parameter, the list of layer **names**.

The play service is in charge of converting those layer names into the URLs. This way, a client cannot send any random
URL to the play service.

When the play service receives the layer names, it validates these names and sends back the URLs + sends the names+urls to the back.
If the layers cannot be validated, the websocket connections sends an error message and closes. The user is sent back to the "choose your Woka" screen.

## Getting the list of available Wokas

The play service can send the list of available Wokas to the user.
It can actually query the admin for this list, if needed (= if an admin is configured)

## In the play service

The play service contains a classes in charge of managing the Wokas:

- `LocalWokaService`: used when no admin is connected. Returns a hard-coded list of Wokas (stored in `play/src/data/woka.json`).
- `AdminWokaService`: used to delegate the list of Wokas to the admin.
