{.section-title.accent.text-primary}
# API Reference

### Sending a message in the chat

```
sendChatMessage(message: string, author: string): void
```

Sends a message in the chat. The message is only visible in the browser of the current user.

*   **message**: the message to be displayed in the chat
*   **author**: the name displayed for the author of the message. It does not have to be a real user.

Example:

```javascript
WA.sendChatMessage('Hello world', 'Mr Robot');
```

### Listening to messages from the chat

```javascript
onChatMessage(callback: (message: string) => void): void
```

Listens to messages typed by the current user and calls the callback. Messages from other users in the chat cannot be listened to.

*   **callback**: the function that will be called when a message is received. It contains the message typed by the user.

Example:

```javascript
WA.onChatMessage((message => {
    console.log('The user typed a message', message);
}));
```

### Detecting when the user enters/leaves a zone

```
onEnterZone(name: string, callback: () => void): void
onLeaveZone(name: string, callback: () => void): void
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
WA.onEnterZone('myZone', () => {
    WA.sendChatMessage("Hello!", 'Mr Robot');
})

WA.onLeaveZone('myZone', () => {
    WA.sendChatMessage("Goodbye!", 'Mr Robot');
})
```

### Opening a popup

In order to open a popup window, you must first define the position of the popup on your map.

You can position this popup by using a "rectangle" object in Tiled that you will place on an "object" layer.

<div class="row">
    <div class="col">
        <img src="https://workadventu.re/img/docs/screen_popup_tiled.png" class="figure-img img-fluid rounded" alt="" />
    </div>
    <div class="col">
        <img src="https://workadventu.re/img/docs/screen_popup_in_game.png" class="figure-img img-fluid rounded" alt="" />
    </div>
</div>

```
openPopup(targetObject: string, message: string, buttons: ButtonDescriptor[]): Popup
```

*   **targetObject**: the name of the rectangle object defined in Tiled.
*   **message**: the message to display in the popup.
*   **buttons**: an array of action buttons defined underneath the popup.

Action buttons are `ButtonDescriptor` objects containing these properties.

*   **label (_string_)**: The label of the button.
*   **className (_string_)**: The visual type of the button. Can be one of "normal", "primary", "success", "warning", "error", "disabled".
*   **callback (_(popup: Popup)=>void_)**: Callback called when the button is pressed.

Please note that `openPopup` returns an object of the `Popup` class. Also, the callback called when a button is clicked is passed a `Popup` object.

The `Popup` class that represents an open popup contains a single method: `close()`. This will obviously close the popup when called.

```javascript
class Popup {
    /**
     * Closes the popup
     */
    close() {};
}
```

Example:

```javascript
let helloWorldPopup;

// Open the popup when we enter a given zone
helloWorldPopup = WA.onEnterZone('myZone', () => {
    WA.openPopup("popupRectangle", 'Hello world!', [{
        label: "Close",
        className: "primary",
        callback: (popup) => {
            // Close the popup when the "Close" button is pressed.
            popup.close();
        }
    });
}]);

// Close the popup when we leave the zone.
WA.onLeaveZone('myZone', () => {
    helloWorldPopup.close();
});
```

### Disabling / restoring controls

```
disablePlayerControls(): void
restorePlayerControls(): void
```

These 2 methods can be used to completely disable player controls and to enable them again.

When controls are disabled, the user cannot move anymore using keyboard input. This can be useful in a "First Time User Experience" part, to display an important message to a user before letting him/her move again.

Example:

```javascript
WA.onEnterZone('myZone', () => {
    WA.disablePlayerControls();
    WA.openPopup("popupRectangle", 'This is an imporant message!', [{
        label: "Got it!",
        className: "primary",
        callback: (popup) => {
            WA.restorePlayerControls();
            popup.close();
        }
    }]);
});
```

### Opening a web page in a new tab

```
openTab(url: string): void
```

Opens the webpage at "url" in your browser, in a new tab.

Example:

```javascript
WA.openTab('https://www.wikipedia.org/');
```

### Opening a web page in the current tab

```
goToPage(url: string): void
```

Opens the webpage at "url" in your browser in place of WorkAdventure. WorkAdventure will be completely unloaded.

Example:

```javascript
WA.goToPage('https://www.wikipedia.org/');
```

### Opening/closing a web page in an iFrame

```
openCoWebSite(url: string): void
closeCoWebSite(): void
```

Opens the webpage at "url" in an iFrame (on the right side of the screen) or close that iFrame.

Example:

```javascript
WA.openCoWebSite('https://www.wikipedia.org/');
// ...
WA.closeCoWebSite();
```

### Load a sound from an url

```
loadSound(url: string): Sound
```

Load a sound from an url

Please note that `loadSound` returns an object of the `Sound` class

The `Sound` class that represents a loaded sound contains two methods: `play(soundConfig : SoundConfig|undefined)` and `stop()`

The parameter soundConfig is optional, if you call play without a Sound config the sound will be played with the basic configuration.

Example:

```javascript
var mySound = WA.loadSound("Sound.ogg");
var config = {
    volume : 0.5,
    loop : false,
    rate : 1,
    detune : 1,
    delay : 0,
    seek : 0,
    mute : false
}
mySound.play(config);
// ...
mySound.stop();
```

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

### Getting the map

```
getMap(): Promise<ITiledMap>
```

Returns a promise that resolves to the JSON file of the map. Please note that if you modified the map (for instance by calling `WA.setProperty`, the data returned by `getMap` will contain those changes.

Example : 
```javascript
WA.getMap().then((data) => console.log(data.layers));
```

### Getting the url of the JSON file map

```
getMapUrl(): Promise<string>
```

Return a promise of the url of the JSON file map.

Example : 
```javascript
WA.getMapUrl().then((mapUrl) => {console.log(mapUrl)});
```

### Getting the roomID
```
getRoomId(): Promise<string>
```
Return a promise of the ID of the current room.

Example : 
```javascript
WA.getRoomId().then((roomId) => console.log(roomId));
```

### Getting the UUID of the current user
```
getUuid(): Promise<string | undefined>
```
Return a promise of the ID of the current user.

Example :
```javascript
WA.getUuid().then((uuid) => {console.log(uuid)});
```

### Getting the nickname of the current user
```
getNickName(): Promise<string | null>
```
Return a promise of the nickname of the current user.

Example :
```javascript
WA.getNickName().then((nickname) => {console.log(nickname)});
```

### Getting the name of the layer where the current user started (if other than start)
```
getStartLayerName(): Promise<string | null>
```
Return a promise of the name of the layer where the current user started if the name is different than "start".

Example :
```javascript
WA.getStartLayerName().then((starLayerName) => {console.log(starLayerName)});
```

### Add a custom menu
```
registerMenuCommand(commandDescriptor: string, callback: (commandDescriptor: string) => void)
```
Add a custom menu item containing the text `commandDescriptor`. A click on the menu will trigger the `callback`.

Example :
```javascript
WA.registerMenuCommand('About', () => {
    console.log("The About menu was clicked");
});

### Getting the list of tags of the current user
```
getTagUser(): Promise<string[]>
```

Returns the tags of the current user. If the current user has no tag, returns an empty list.

Example : 
```javascript
WA.getTagUser().then((tagList) => {
    ...
});
```
