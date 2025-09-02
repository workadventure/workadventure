---
sidebar_position: 60
title: Special zones
---

# Other special zones

:::caution Important
While the information below is still valid, we recommend you to use the new [inline map editor](../inline-editor/) to define silent areas
or attach sounds to an area.
The inline map editor is easier to use and can be accessed directly from WorkAdventure.
:::

## Making a "silent" zone

<iframe width="100%" height="480" src="https://www.youtube.com/embed/z7XLo06o-ow" title="Building your map - Special zones" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>

On your map, you can define special silent zones where nobody is allowed to talk. In these zones, users will not speak to each others, even if they are next to each others.

In order to create a silent zone:

- You must create a specific object.
- Object class must be "`area`"
- In object properties, you MUST add a boolean "`silent`" property. If the silent property is checked, the users are entering the silent zone when they walk on the area.

:::info
As an alternative, you may also put the `silent` property on a layer (rather than putting them on an "area" object)
but we advise to stick with "area" objects for better performance!
:::

## Playing sounds or background music

Your map can define special zones where a sound or background music will automatically be played.

In order to create a zone that triggers sounds/music:

- You must create a specific object.
- Object class must be "`area`"
- In object properties, you MUST add a "`playAudio`" property. The value of the property is a URL to an MP3 file that will be played. The URL can be relative to the URL of the map.
- You may use the boolean property "`audioLoop`" to make the sound loop (thanks captain obvious).
- If the "`audioVolume`" property is set, the audio player uses either the value of the property or the last volume set by the user - whichever is smaller. This property is a float from 0 to 1.0

:::caution
The audio file must be served with CORS headers. If it does not work, you may need to host the audio file on the same server as the map.

If you are using the [map starter kit](https://github.com/workadventure/map-starter-kit), you can put the audio file in the `public` folder of the starter kit and reference it with a relative URL.
For instance, if your audio file is named `background.mp3`, put it in `public/background.mp3` and reference it in your map with `./background.mp3`.
:::

:::note Deprecation notice
"`playAudioLoop`" is deprecated and should not be used anymore.
:::

:::info
As an alternative, you may also put the `playAudio` properties on a layer (rather than putting them on an "area" object)
but we advise to stick with "area" objects for better performance!
:::
