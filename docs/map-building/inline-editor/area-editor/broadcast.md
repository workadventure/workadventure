---

sidebar_position: 30

---

# Podium / Stage / Presentation Zones

Use the podium feature to build stages (aka. speaker zones / presentation zones) to stream your video / audio / screen to anyone
in the corresponding audience (aka. listener zone / auditorium / presentation zone).

You typically use this feature to build a stage where a speaker can present to an audience.
The stage is the **podium**. Anyone walking on the stage will be able to stream their video / audio / screen.
To listen to the speakers, you go in to **audience** zone. Anyone walking in the audience will be able to see and hear the speaker(s)
on the podium.

Please note that [access to the map editor](../index.md) is required to perform the following steps.

#### Creating a podium

![](../../images/editor/megaphone_speaker_1.png)

1. Open the map editor.
2. Access the "area map editor" section.
3. Create an area by clicking on the map directly or by selecting a zone.
4. Click on the "podium" icon.

![](../../images/editor/megaphone_speaker_2.png)

5. Name your podium zone. (a unique name, and this name will be used in the audience) If you use the same name for multiple 
   podiums, they will be linked together and speakers in any of these podiums will be heard/seen in all the associated podiums and audience zones.
6. (Optional) You can also create a chat channel for this zone. This forum will be used to chat with the people on the podium.
7. (Optional) Enable **"See attendees"** to allow speakers on the podium to see the video feeds of the audience members they are presenting to.

![](../../images/editor/broadcast_see_attendees.png)

:::tip
The "See attendees" option is useful when speakers want to interact with their audience and see their reactions in real-time. When enabled, speakers will see the video bubbles of audience members while presenting, but they will not hear them. To be heard, someone in the audience can step onto the podium, or raise their hand and wait for a speaker or an administrator to give them the floor.
:::

#### Creating an "audience" zone

![](../../images/editor/megaphone_listener_1.png)

8. Create a new area by clicking on the map directly or by selecting a zone.
9. Click on the "audience" icon.

![](../../images/editor/megaphone_listener_2.png)

10. Select the podium that you already created in the **Podium Name** selector.
11. (Optional) You can also create a chat channel for this zone. This channel will be used to chat with the people in the audience. It is also needed for [polls and questions](/user/polls-and-questions) in this zone.

:::note
If you enable "associate a dedicated chat channel" in both areas, both chats will be merged and can be used by users in the podium and in the audience.
:::

12. (Optional) Turn on **Allow talking and forming bubbles** to let the people in the audience talk to each other in discussion bubbles. It is off by default: people in the audience can only listen, and their camera and microphone buttons are hidden.
![The options of an audience zone](../../images/editor/audience_options.png)

13. (Optional) In **Media to display before the live starts**, paste the link of a video or a page (YouTube, for instance). The audience sees it until a speaker steps on the podium. Without it, they see "Waiting for speaker".
14. (Optional) Turn off **"Allow raising hands"** so that people in this audience can no longer [raise their hand](/user/raise-hand) to the speakers. It is on by default, and lets speakers give the floor to someone in the audience. It does not stop people from raising their hand in a discussion bubble.

You're done ! Now, anyone in the audience will be able to hear/see the speakers that are on the podium/stage.
When a user will enter the podium, he will trigger the megaphone directly and will stream to the audience associated with the podium.
