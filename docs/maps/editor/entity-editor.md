# Placing objects and furniture

Are you moving into your new virtual office? Or are you organizing a conference? In any case, you will need to place 
objects and furniture in your map.

## The entity editor

Use the entity editor to drag'n'drop objects from the right panel into the map.





TODO
TODO
TODO
TODO
TODO
TODO


## Frequently Asked Questions

### Can I import my own objects?

As of now, it is not possible to import your own objects in the inline map editor using a graphical interface.
This will come in future releases, as we extend the capabilities of the inline map editor.

However, if you are a die-hard fan and are not afraid of doing some technical work, you can define your own object 
collections by writing a JSON file and then manually modifying the map file (with the `.wam` extension) to add a 
reference to your JSON object collection.

TODO: add links to the documentation of the JSON format.
TODO: document the existence of WAM files

### I cannot move or select an object on the map

If you cannot move or select an object on the map, it is probably because the object is part of the Tiled map (the `.tmj` file).
In order to move or select an object, it must be created from the inline map editor.

If the object is a sprite part of the Tiled map, you won't be able to move it. You will have to delete it from the Tiled
map and recreate it in the inline map editor.