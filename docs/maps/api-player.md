{.section-title.accent.text-primary}
# API Player functions Reference

### Getting information on the current user
```
WA.player.getCurrentUser(): Promise<User>
```
Return a promise that resolves to a `User` object with the following attributes :
* **id (string) :** ID of the current user
* **nickName (string) :** name displayed above the current user
* **tags (string[]) :** list of all the tags of the current user

Example :
```javascript
WA.player.getCurrentUser().then((user) => {
    if (user.nickName === 'ABC') {
        console.log(user.tags);
    }
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
*    **y (number):** coordinate Y of the current player.

**callback:** the function that will be called when the current player is moving. It contains the event.

Example :
```javascript
WA.player.onPlayerMove(console.log);
```