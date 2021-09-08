{.section-title.accent.text-primary}
# Variables

Maps can contain **variables**. Variables are piece of information that store some data. In computer science, we like
to say variables are storing the "state" of the room.

- Variables are shared amongst all players in a given room. When the value of a variable changes for one player, it changes
  for everyone.
- Variables are **invisible**. There are plenty of ways they can act on the room, but by default, you don't see them.

## Declaring a variable

In order to declare allowed variables in a room, you need to add **objects** in an "object layer" of the map.

Each object will represent a variable.

<div class="row">
    <div class="col">
        <img src="images/object_variable.png" class="figure-img img-fluid rounded" alt="" />
    </div>
</div>

The name of the variable is the name of the object.
The object **type** MUST be **variable**.

You can set a default value for the object in the `default` property.

## Persisting variables state

Use the `persist` property to save the state of the variable in database. If `persist` is false, the variable will stay
in the memory of the WorkAdventure servers but will be wiped out of the memory as soon as the room is empty (or if the
server restarts).

{.alert.alert-info}
Do not use `persist` for highly dynamic values that have a short life spawn.

## Managing access rights to variables

With `readableBy` and `writableBy`, you control who can read of write in this variable. The property accepts a string
representing a "tag". Anyone having this "tag" can read/write in the variable.

{.alert.alert-warning}
`readableBy` and `writableBy` are specific to the "online" version of WorkAdventure because the notion of tags
is not available unless you have an "admin" server (that is not part of the self-hosted version of WorkAdventure).

In a future release, the `jsonSchema` property will contain [a complete JSON schema](https://json-schema.org/) to validate the content of the variable.
Trying to set a variable to a value that is not compatible with the schema will fail.

## Using variables

There are plenty of ways to use variables in WorkAdventure:

- Using the [scripting API](api-state.md), you can read, edit or track the content of variables.
- Using the [Action zones](https://workadventu.re/map-building-extra/generic-action-zones.md), you can set the value of a variable when someone is entering or leaving a zone
- By [binding variable values to properties in the map](https://workadventu.re/map-building-extra/variable-to-property-binding.md)
- By [using automatically generated configuration screens](https://workadventu.re/map-building-extra/automatic-configuration.md) to create forms to edit the value of variables

In general, variables can be used by third party libraries that you can embed in your map to add extra features.
A good example of such a library is the ["Scripting API Extra" library](https://workadventu.re/map-building-extra/about.md)
