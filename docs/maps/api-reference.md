{.section-title.accent.text-primary}
# API Reference

- [Navigation functions](api-nav.md)
- [Chat functions](api-chat.md)
- [Room functions](api-room.md)
- [UI functions](api-ui.md)
- [Sound functions](api-sound.md)
- [Controls functions](api-controls.md)

- [List of deprecated functions](api-deprecated.md)

### Show / Hide a layer
```
WA.showLayer(layerName : string): void
WA.hideLayer(layerName : string) : void
```
These 2 methods can be used to show and hide a layer.

Example :
```javascript
WA.showLayer('bottom');
//...
WA.hideLayer('bottom');
```

### Set/Create properties in a layer

```
WA.setProperty(layerName : string, propertyName : string, propertyValue : string | number | boolean | undefined) : void;
```

Set the value of the `propertyName` property of the layer `layerName` at `propertyValue`. If the property doesn't exist, create the property `propertyName` and set the value of the property at `propertyValue`.

Example :
```javascript
WA.setProperty('wikiLayer', 'openWebsite', 'https://www.wikipedia.org/');
```

### Listen to player movement 

```
onPlayerMove(callback: HasPlayerMovedEventCallback): void;
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
WA.onPlayerMove(console.log);
```

### Getting informations on the current user
```
getCurrentUser(): Promise<User>
```
Return a promise that resolves to a `User` object with the following attributes :
* **id (string) :** ID of the current user
* **nickName (string) :** name displayed above the current user
* **tags (string[]) :** list of all the tags of the current user

Example : 
```javascript
WA.getCurrentUser().then((user) => {
    if (user.nickName === 'ABC') {
        console.log(user.tags);
    }
})
```

### Getting informations on the current room
```
getCurrentRoom(): Promise<Room>
```
Return a promise that resolves to a `Room` object with the following attributes : 
* **id (string) :** ID of the current room
* **map (ITiledMap) :** contains the JSON map file with the properties that were setted by the script if `setProperty` was called.
* **mapUrl (string) :** Url of the JSON map file
* **startLayer (string | null) :** Name of the layer where the current user started, only if different from `start` layer

Example : 
```javascript
WA.getCurrentRoom((room) => {
    if (room.id === '42') {
        console.log(room.map);
        window.open(room.mapUrl, '_blank');
    }
})
```

### Add a custom menu
```
registerMenuCommand(commandDescriptor: string, callback: (commandDescriptor: string) => void): void
```
Add a custom menu item containing the text `commandDescriptor`. A click on the menu will trigger the `callback`.

Example :
```javascript
WA.registerMenuCommand('About', () => {
    console.log("The About menu was clicked");
});
```


### Working with group layers
If you use group layers in your map, to reference a layer in a group you will need to use a `/` to join layer names together.

Example : 
<div class="row">
    <div class="col">
        <img src="https://workadventu.re/img/docs/groupLayer.png" class="figure-img img-fluid rounded" alt="" />
    </div>
</div>

The name of the layers of this map are : 
* `entries/start`
* `bottom/ground/under`
* `bottom/build/carpet`
* `wall`