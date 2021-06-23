{.section-title.accent.text-primary}
# API Room functions Reference

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

### Detecting when the user enters/leaves a zone

```
WA.room.onEnterZone(name: string, callback: () => void): void
WA.room.onLeaveZone(name: string, callback: () => void): void
```

Listens to the position of the current user. The event is triggered when the user enters or leaves a given zone. The name of the zone is stored in the map, on a dedicated layer with the `zone` property.

<div>
    <figure class="figure">
        <img src="https://workadventu.re/img/docs/trigger_event.png" class="figure-img img-fluid rounded" alt="" />
        <figcaption class="figure-caption">The `zone` property, applied on a layer</figcaption>
    </figure>
</div>

*   **name**: the name of the zone, as defined in the `zone` property.
*   **callback**: the function that will be called when a user enters or leaves the zone.

Example:

```javascript
WA.room.onEnterZone('myZone', () => {
    WA.chat.sendChatMessage("Hello!", 'Mr Robot');
})

WA.room.onLeaveZone('myZone', () => {
    WA.chat.sendChatMessage("Goodbye!", 'Mr Robot');
})
```

### Show / Hide a layer
```
WA.room.showLayer(layerName : string): void
WA.room.hideLayer(layerName : string) : void
```
These 2 methods can be used to show and hide a layer.

Example :
```javascript
WA.room.showLayer('bottom');
//...
WA.room.hideLayer('bottom');
```

### Set/Create properties in a layer

```
WA.room.setProperty(layerName : string, propertyName : string, propertyValue : string | number | boolean | undefined) : void;
```

Set the value of the `propertyName` property of the layer `layerName` at `propertyValue`. If the property doesn't exist, create the property `propertyName` and set the value of the property at `propertyValue`.

Example :
```javascript
WA.room.setProperty('wikiLayer', 'openWebsite', 'https://www.wikipedia.org/');
```

### Getting information on the current room
```
WA.room.getCurrentRoom(): Promise<Room>
```
Return a promise that resolves to a `Room` object with the following attributes :
* **id (string) :** ID of the current room
* **map (ITiledMap) :** contains the JSON map file with the properties that were setted by the script if `setProperty` was called.
* **mapUrl (string) :** Url of the JSON map file
* **startLayer (string | null) :** Name of the layer where the current user started, only if different from `start` layer

Example :
```javascript
WA.room.getCurrentRoom((room) => {
    if (room.id === '42') {
        console.log(room.map);
        window.open(room.mapUrl, '_blank');
    }
})
```

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
WA.room.getCurrentUser().then((user) => {
    if (user.nickName === 'ABC') {
        console.log(user.tags);
    }
})
```
