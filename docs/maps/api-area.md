{.section-title.accent.text-primary}

# API Area functions Reference

### Working with area objects
You can use Tiled objects of special type `area` to hold various properties, instead of layers. They too can be modified with scripting API.
### Detecting when the user enters/leaves an area

```ts
WA.area.onEnter(name: string): Subscription
WA.area.onLeave(name: string): Subscription
```

Listens to the position of the current user. The event is triggered when the user enters or leaves a given area.

- **name**: the name of the area as defined in Tiled.

Example:

```ts
const myAreaSubscriber = WA.area.onEnter("myArea").subscribe(() => {
  WA.chat.sendChatMessage("Hello!", "Mr Robot");
});

WA.area.onLeave("myArea").subscribe(() => {
  WA.chat.sendChatMessage("Goodbye!", "Mr Robot");
  myAreaSubscriber.unsubscribe();
});
```

### Create Area

You can create new Area object (currently limited to rectangular shapes):

```ts
const area = WA.area.create({
    name: 'MyNewArea',
    x: 100,
    y: 100,
    width: 320,
    height: 320,
});
```

### Modify Area

It is possible to modify already existing Area object (currently limited to x, y, width, height):

```ts
const area = await WA.area.get('MyNewArea');
if (area) {
    area.x = 150;
    area.y = 150;
}
```

### Delete Area

You can delete Area if it has a name:

```ts
WA.area.delete('MeNewArea');
```

### Set/Create properties in an Area object

```ts
WA.area.setProperty(areaName : string, propertyName : string, propertyValue : string | number | boolean | undefined) : void;
```

Set the value of the `propertyName` property of the area `areaName` at `propertyValue`. If the property doesn't exist,
create the property `propertyName` and set the value of the property at `propertyValue`.

Note :
To unset a property from an area, use `setProperty` with `propertyValue` set to `undefined`.

Example :

```ts
WA.area.setProperty("wikiArea", "openWebsite", "https://www.wikipedia.org/");
```