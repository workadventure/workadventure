---
sidebar_position: 1
---

# Map Building

Welcome to the WorkAdventure map building documentation!

This guide will provide you with instructions on how to edit and create maps for WorkAdventure, allowing you to
customize your virtual spaces and create engaging interactive experiences. There are two primary methods for editing
maps: using the inline editor and utilizing Tiled.

## Inline Map Editor

The inline map editor is a user-friendly tool that enables you to quickly *place objects, furniture*, and define *areas of
interest* within your map.

In order to use the inline map editor, you must be inside your map and logged with an account that has the
"admin" or "editor" tag. The map editor icon will be visible in the action bar at the bottom of the screen.


![Map editor icon](./images/editor/map-editor-icon.png)

<div class="text--center margin-top--lg">
    <a href="inline-editor/" class="button button--primary">Read the Inline Map Editor documentation &gt;</a>
</div>

## Tiled

For more extensive customization and advanced map editing, you can utilize Tiled, a powerful offline map editor.
Tiled provides additional features such as placing floors, walls, and the ability to incorporate scripts for
dynamic behavior.

<div class="text--center margin-top--lg">
    <a href="tiled-editor/" class="button button--primary">Read the Tiled Editor documentation &gt;</a>
</div>


## What tool should I use?

| Task                                                                      | Recommended tool                                               |
|---------------------------------------------------------------------------|----------------------------------------------------------------|
| I want to quickly place **objects** or **furniture** (tables / chairs...) | Inline Map Editor ([Entity Editor](inline-editor/entity-editor/index.md))   |
| I want to add **interactive objects** (computer opening a website...)     | Inline Map Editor ([entity editor](inline-editor/entity-editor/index.md))   |
| I want to add **areas** of interest (exits, entries, meeting rooms...)    | Mostly Inline Map Editor ([Entity Editor](inline-editor/area-editor/index.md)) |
| I want to edit the map in **real-time**, cooperating with multiple users  | [Inline Map Editor](inline-editor/index.md)                          |
| I want to configure global settings (Microphone...)                       | [Inline Map Editor](inline-editor/index.md)                          |
| I want to edit **floors** and **walls**                                   | [Tiled](tiled-editor/index.md)                                     |
| I want to create a map **from scratch**                                   | [Tiled](tiled-editor/index.md)                                     |
| I want to write **scripts** to make the map dynamic                       | Tiled ([Map Scripting API](/developer/map-scripting/))                          |
<br/>
<br/>