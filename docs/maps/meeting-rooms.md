{.section-title.accent.text-primary}
# Meeting rooms

[Building your map - Meeting room](https://www.youtube.com/watch?v=cN9VMWHN0eo)

## Opening a Jitsi meet when walking on the map

On your map, you can define special zones (meeting rooms) that will trigger the opening of a Jitsi meet. When a player will pass over these zones, a Jitsi meet will open (as an iframe on the right side of the screen)

In order to create Jitsi meet zones:

*   You must create a specific layer.
*   In layer properties, you MUST add a "`jitsiRoom`" property (of type "`string`"). The value of the property is the name of the room in Jitsi. Note: the name of the room will be "slugified" and prepended with the name of the instance of the map (so that different instances of the map have different rooms)
*   You may also use "jitsiWidth" property (of type "number" between 0 and 100) to control the width of the iframe containing the meeting room.

## Triggering of the "Jitsi meet" action

By default, Jitsi meet will open when a user enters the zone defined on the map.

It is however possible to trigger Jitsi only on user action. You can do this with the `jitsiTrigger` property.

If you set `jitsiTrigger: onaction`, when the user walks on the layer, an alert message will be displayed at the bottom of the screen:

<figure class="figure">
    <img src="images/click_space_jitsi.png" class="figure-img img-fluid rounded" alt="" />
    <figcaption class="figure-caption">Jitsi meet will only open if the user clicks Space</figcaption>
</figure>

If you set `jitsiTriggerMessage: your message action` you can edit alert message displayed. If is not defined, the default message displayed is 'Press on SPACE to enter in jitsi meet room'.

## Customizing your "Jitsi meet"

Your Jitsi meet experience can be customized using Jitsi specific config options. The `jitsiConfig` and `jitsiInterfaceConfig` properties can be used on the Jitsi layer to change the way Jitsi looks and behaves. Those 2 properties are accepting a JSON string.

For instance, use `jitsiConfig: { "startWithAudioMuted": true }` to automatically mute the microphone when someone enters a room. Or use `jitsiInterfaceConfig: { "DEFAULT_BACKGROUND": "#77ee77" }` to change the background color of Jitsi.

The `jitsiConfig` property will override the Jitsi [config.js](https://github.com/jitsi/jitsi-meet/blob/master/config.js) file

The `jitsiInterfaceConfig` property will override the Jitsi [interface_config.js](https://github.com/jitsi/jitsi-meet/blob/master/interface_config.js) file

<div class="alert alert-warning">If your customizations are not working:
<ul>
<li>First, check that the JSON you are entering is valid. Take a look at the console in your browser. If the JSON string is invalid, you should see a warning.</li>
<li>Then, check that the JSON you are using is matching the version of Jitsi used.</li>
</ul>
</div>

## Granting moderator controls in Jitsi

{.alert.alert-info}
Moderator controls are linked to member tags. You need a pro account to edit member tags.

You can grant moderator rights to some of your members. Jitsi moderators can:

*   Publish a Jitsi meeting on Youtube Live (you will need a Youtube Live account)
*   Record a meeting to Dropbox (you will need a Dropbox account)
*   Mute someone
*   Mute everybody expect one speaker
*   Kick users out of the meeting

In order to grant moderator rights to a given user, you can add a `jitsiRoomAdminTag` property to your Jitsi layer. For instance, if you write a property:

    jitsiRoomAdminTag: speaker

then, any of your member with the `speaker` tag will be automatically granted moderator rights over this Jitsi instance.

You can read more about [managing member tags in the admin documentation](/admin-guide/manage-members).

## Using another Jitsi server

WorkAdventure usually comes with a default Jitsi meet installation. If you are using the online version at `workadventu.re`, we are handling a Jitsi meet cluster for you. If you are running the self-hosted version of WorkAdventure, the administrator probably set up a Jitsi meet instance too.

You have the possibility, in your map, to override the Jitsi meet instance that will be used by default. This can be useful for regulatory reasons. Maybe your company wants to keep control on the video streams and therefore, wants to self-host a Jitsi instance? Or maybe you want to use a very special configuration or very special version of Jitsi?

Use the `jitsiUrl` property to in the Jitsi layer to specify the Jitsi instance that should be used. Beware, `jitsiUrl` takes in parameter a **domain name**, without the protocol. So you should use:  
`jitsiUrl: meet.jit.si`  
and not  
`jitsiUrl: https://meet.jit.si`

{.alert.alert-info}
When you use `jitsiUrl`, the targeted Jitsi instance must be public. You cannot use moderation features or the JWT 
tokens authentication with maps configured using the `jitsiUrl` property.
