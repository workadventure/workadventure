{.section-title.accent.text-primary}
# Other special zones

## Making a "silent" zone

[Building your map - Special zones](https://www.youtube.com/watch?v=z7XLo06o-ow)

On your map, you can define special silent zones where nobody is allowed to talk. In these zones, users will not speak to each others, even if they are next to each others.

In order to create a silent zone:

*   You must create a specific layer.
*   In layer properties, you MUST add a boolean "`silent`" property. If the silent property is checked, the users are entering the silent zone when they walk on any tile of the layer.

## Playing sounds or background music

Your map can define special zones where a sound or background music will automatically be played.

In order to create a zone that triggers sounds/music:

*   You must create a specific layer.
*   In layer properties, you MUST add a "`playAudio`" property. The value of the property is a URL to an MP3 file that will be played. The URL can be relative to the URL of the map.
*   You may use the boolean property "`audioLoop`" to make the sound loop (thanks captain obvious).
*   If the "`audioVolume`" property is set, the audio player uses either the value of the property or the last volume set by the user - whichever is smaller. This property is a float from 0 to 1.0

{.alert.alert-info}
"`playAudioLoop`" is deprecated and should not be used anymore.
