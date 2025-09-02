---
sidebar_position: 90
---

# Writing text on a map

## Solution 1: design a specific tileset (recommended)

If you want to write some text on a map, our recommendation is to create a tileset that contains
your text. You will obtain the most pleasant graphical result with this result, since you will be able
to control the fonts you use, and you will be able to disable the antialiasing of the font to get a
"crispy" result easily.

## Solution 2: using a "text" object in Tiled

On "object" layers, Tiled has support for "Text" objects. You can use these objects to add some
text on your map.

WorkAdventure will do its best to display the text properly. However, you need to know that:

- Tiled displays your system fonts.
- Computers have different sets of fonts. Therefore, browsers never rely on system fonts
- Which means if you select a font in Tiled, it is quite unlikely it will render properly in WorkAdventure

To circumvent this problem, in your text object in Tiled, you can add an additional property: `font-family`.

The `font-family` property can contain any "web-font" that can be loaded by your browser.

:::info Pro-tip
By default, WorkAdventure uses the **'"Press Start 2P"'** font, which is a great pixelated
font that has support for a variety of accents. It renders great when used at _8px_ size.
:::

![The "font-family" property](../images/text-object.png)
