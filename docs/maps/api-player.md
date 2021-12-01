{.section-title.accent.text-primary}
# API Player functions Reference

### Get the player name

```
WA.player.name: string;
```

The player name is available from the `WA.player.name` property.

{.alert.alert-info}
You need to wait for the end of the initialization before accessing `WA.player.name`

```typescript
WA.onInit().then(() => {
    console.log('Player name: ', WA.player.name);
})
```

### Get the player ID

```
WA.player.id: string|undefined;
```

The player ID is available from the `WA.player.id` property.
This is a unique identifier for a given player. Anonymous player might not have an id.

{.alert.alert-info}
You need to wait for the end of the initialization before accessing `WA.player.id`

```typescript
WA.onInit().then(() => {
    console.log('Player ID: ', WA.player.id);
})
```

### Get the tags of the player

```
WA.player.tags: string[];
```

The player tags are available from the `WA.player.tags` property.
They represent a set of rights the player acquires after login in.

{.alert.alert-warn}
Tags attributed to a user depend on the authentication system you are using. For the hosted version
of WorkAdventure, you can define tags related to the user in the [administration panel](https://workadventu.re/admin-guide/manage-members).

{.alert.alert-info}
You need to wait for the end of the initialization before accessing `WA.player.tags`

```typescript
WA.onInit().then(() => {
    console.log('Tags: ', WA.player.tags);
})
```

### Get the user-room token of the player

```
WA.player.userRoomToken: string;
```

The user-room token is available from the `WA.player.userRoomToken` property.
This token is generated in WorkAdventure and contains information such as the player's room ID and its associated membership ID.

{.alert.alert-warn}
This token is used when you change your logo using a configured variable.
Indeed, to change your logo you need to perform an upload in order to get a file URL. This type of actions must be validated on our side.
If you are using a self-hosted version of WorkAdventure you will not have the possibility to perform actions that depends on the user-room token, unless you create an API that support it.

{.alert.alert-info}
You need to wait for the end of the initialization before accessing `WA.player.userRoomToken`

```typescript
WA.onInit().then(() => {
    console.log('Token: ', WA.player.userRoomToken);
})
```

### Listen to player movement
```
WA.player.onPlayerMove(callback: HasPlayerMovedEventCallback): void;
```
Listens to the movement of the current user and calls the callback. Sends an event when the user stops moving, changes direction and every 200ms when moving in the same direction.

The event has the following attributes :
*   **moving (boolean):**  **true** when the current player is moving, **false** otherwise.
*   **direction (string):** **"right"** | **"left"** | **"down"** | **"top"** the direction where the current player is moving.
*   **x (number):** coordinate X of the current player.
*   **y (number):** coordinate Y of the current player.
*   **oldX (number):** old coordinate X of the current player.
*   **oldY (number):** old coordinate Y of the current player.

**callback:** the function that will be called when the current player is moving. It contains the event.

Example :
```javascript
WA.player.onPlayerMove(console.log);
```
