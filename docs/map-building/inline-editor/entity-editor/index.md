# Placing Objects and Furniture

Are you moving into your new virtual office? Or are you organizing a conference? In any case, you will need to place
objects and furniture in your map.

## The entity editor

Use the entity editor to drag'n'drop objects from the right panel into the map.

<iframe width="100%" height="480" src="https://www.youtube.com/embed/WfGBxyVctgY?si=-PP8ymTmDRXmWXGd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>

Some objects can be rotated (top, left, bottom, right).
Some objects can have different colors.

When you click on an object, you can attach a number of actions in the right panel.

## Objects name

Objects can have a name.
The name of the object is displayed in a pop-up when users click on the object.

## Attaching actions to objects

When you add an action to an object, the object becomes "clickable" by users.
When a user clicks on the object, a pop-up is displayed with the list of possible actions.

Possible actions are:

- **[Opening a link](open-link.md)**: Opens a webpage, either inside WorkAdventure or in a new tab of the browser.
- **[Opening a videoconference](jitsi.md)**: Opens a Jitsi video conference inside WorkAdventure. You could for instance attach
  a videoconference to a phone or a phonebooth inside your map that would connect you to a Jitsi room in another
  part of the map.
- **[Play an audio file](play-sound.md)**: Plays an audio file. Useful for Jukeboxes!

## Snapping objects to the grid

When placing objects on the map, you can place most objects in a "pixel perfect" way.
If you hold the SHIFT key, objects will be "snapped" to the grid.

WorkAdventure will force any "colliding" objects to be snapped to the grid. This means that if an object cannot be
traversed (like a table), WorkAdventure will make it snap to the grid. This is a limitation of the physics engine
used internally by WorkAdventure.

## Deleting an object

You can delete an object by selecting it and pressing the `Delete` key on your keyboard.
Alternatively, if you have many objects to delete, you can select the "delete tool" (the bin icon) in the toolbar and
click on the objects you want to delete.

## Uploading an object

You can upload your custom objects and place them on your map.

To upload an object, open the Entity editor and click on the upload zone at the bottom. You can also drag/drop your object image in the upload zone.

![Upload Object](../../images/editor/entity-upload/upload-object.png)

You will see the upload form allowing you to configure your asset <strong>BEFORE</strong> upload.

![Upload Form 1](../../images/editor/entity-upload/upload-form.png)

In this form you can :

- Define the asset name
- Add tags (separated by a comma)
- Define object depth
- Define the object as "floating object"

Once your object is uploaded, you can access it by searching it or click on "Custom" category in entity list.

![Upload ended](../../images/editor/entity-upload/upload-ended.png)

### Object depth

Object depth is a way to define how your Woka will be displayed while walking through the object. You can use depth preset or define your own by selecting "Custom".

- Standing : Your Woka will be displayed behind the object
- On the floor: Your Woka will walk upon the object
- Custom : Move the blue selector near the object to define the point where the Woka will be displayed behind the object

![Upload Form 2](../../images/editor/entity-upload/upload-form-2.png)

### Floating object

By default, a custom object can be placed on the map guided by a grid. By leaving this parameter unchecked, you can click on the image to define the collide parameter (define if your Woka can walk through the object or if he needs to walk around it).
If you check the "floating object" checkbox, your object can by placed freely on the map. It does not stick to the grid anymore. However, you will not have the opportunity to define a collision grid anymore.

![Upload Form 3](../../images/editor/entity-upload/upload-form-3.png)

Note : The "floating object" checkbox is <strong>NOT EDITABLE</strong> after upload. A floating object will never have a collision grid.

## Editing an object

On the entity editor your can edit your custom objects. Included defaults objects are not editable.
To edit a custom object, select it and click on "edit" button.

![Edit object](../../images/editor/entity-edition/edit-object.png)

You will see an edit form on wich you can :

- Edit the name
- Add/remove tags
- Edit depth ([learn more](#object-depth))
- Remove the object (this action will also remove the object on the map if it was already placed)

![Edit object](../../images/editor/entity-edition/edit-object-2.png)

Do not forget to save your modifications by clicking on the "Save" button.

## Frequently Asked Questions

### I cannot move or select an object on the map

If you cannot move or select an object on the map, it is probably because the object is part of the Tiled map (the `.tmj` file).
In order to move or select an object, it must be created from the inline map editor.

If the object is a sprite part of the Tiled map, you won't be able to move it. You will have to delete it from the Tiled
map and recreate it in the inline map editor.

## Special thanks

:::info Sponsored feature ❤️
This work has been supported by the French government in the context of the "Programme d'Investissements d'Avenir" 
(Investments for the Future Program), managed by the National Research Agency (ANR) under the reference ANR-21-DMES-0001.
:::
