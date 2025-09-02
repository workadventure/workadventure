---
sidebar_position: 10
---

# Inline Map Editor

The map editor is a tool built into WorkAdventure that allows you to quickly place objects, furniture, and define areas
of interest within your map.

:::info
The inline map editor is very user-friendly but lacks some advanced features (like placing floor, walls, or adding
scripts). If you want to create a map from scratch, you should start using [Tiled](../tiled-editor/) first
and then use the inline map editor for finishing.
:::

## How to access the inline map editor

In order to use the inline map editor, you must be inside your map and logged with an account that has the
"admin" or "editor" tag. The map editor icon will be visible in the action bar at the bottom of the screen.

![Map editor icon](../images/editor/map-editor-icon.png)

In order to create a member of your world with the "admin" or the "editor" tag, please read the
[corresponding documentation](/admin/members).

:::caution Self-hosted users
If you are using a self-hosted version of WorkAdventure, please [read this guide](https://github.com/workadventure/workadventure/blob/master/docs/others/self-hosting/self-hosted-access.md) to access the map editor.
:::

## Map editor tools

The map editor provides a set of tools that can be accessed from the toolbar on the top right side of the screen.

- The **[entity editor tool](entity-editor/index.md)** can be used to place objects on the map (chairs, tables, paintings, plants, etc...).
  Those objects (we call them "entities") can be made interactive. When clicking an interactive entity, a dialog box
  will appear proposing a number of options (opening a website, entering a Jitsi room, etc...)
- The **delete** tool allows you to easily delete any entity places on the map using the entity editor tool.
- The **[area editor tool](area-editor/)** allows you to define areas that will be triggered when the player walks on them. Those areas
  can also be used to trigger actions (like opening a website, entering a Jitsi room, etc...).
- Use **[configure my room](megaphone.md)** to modify global settings of the room you are currently in.
  As of now, it only allows configuring the megaphone.
