{.section-title.accent.text-primary}
# API Room functions Reference

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
