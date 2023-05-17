{.section-title.accent.text-primary}
# Broadcasting / Megaphone
Use the broadcast feature to stream your video / audio / screen to anyone.

Let's comment this part as it is not implemented yet

<!--
### Area map editor
Use the broadcast feature to stream your video / audio / screen to anyone within the **broadcast zone**.

To use the broadcast feature, you must first define a speaker zone and a listener zone :

- The **listener zone** : anyone within this zone will be able to hear/see the speakers that are in the speaker zone.
- The **speaker zone** : you can start streaming by :
  - either clicking the "megaphone" icon (if the megaphone is authorized in that zone).
  - or by walking on the "stage". The "stage" is a special zone that will stream to the listener zones.
  - or by using the Scripting API.
-->

### Configuring the global megaphone
To configure the global megaphone feature in WorkAdventure, follow the steps below. Please note that access to the map editor is required to perform these configurations.

Microphone settings will affect the entire map.

<div class="row">
    <div class="col">
        <img src="images/megaphone_general.png" class="figure-img img-fluid rounded" alt="" />
    </div>
</div>

1. Open the map editor.
2. Access the "configure my room" modal.
3. Navigate to the megaphone tab.
4. Toggle the the general megaphone on or off.
5. Assign a unique name to your megaphone.
6. Define the scope of your megaphone. The scope can be set as "room" or "world". If you choose "room", the megaphone's range will be limited to the current room. If you select "world", the megaphone's reach will extend across multiple rooms. Individuals in any room configured with the same "space name" will be able to hear you when the megaphone is enabled.
7. Manage the megaphone's usage by applying rights restrictions. You can limit the megaphone's access to specific users or user groups using tags.