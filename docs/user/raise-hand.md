---
sidebar_position: 40
---

# Raising your hand

Raise your hand to signal that you want to speak, without interrupting whoever is talking.
Your raised hand is shown on the map and on your video, and everyone in the conversation sees who raised their hand first.

## Raising your hand

The **Raise your hand** button sits in the action bar, next to the camera and microphone buttons.
On small screens, it is in the profile menu.

<!-- TODO screenshot: The "Raise your hand" button -->

Click it to raise your hand, and click it again to lower it. The button has three states:

- **Normal**: your hand is down. Click to raise it.
- **Highlighted**: your hand is up. Click to lower it.
- **Green**: you were given the floor (see [Speakers and moderators](#for-speakers-and-moderators)). Click to give it back.

You can raise your hand:

- in a discussion bubble, when you are talking with other people around you,
- in a meeting room,
- in the audience of a podium,
- while someone is speaking in the megaphone.

The button is hidden when you are speaking on a podium or in the megaphone, in a silent zone, and while a Jitsi or BigBlueButton meeting is open (Jitsi has its own "raise hand" button).
Map creators can also turn raising hands off in a meeting room or in an audience zone (see [Meeting room property](/map-building/inline-editor/area-editor/meetingRoom) and [Podium and audience](/map-building/inline-editor/area-editor/broadcast)).

### Choosing where to raise your hand

Your hand is raised in one conversation, not everywhere. If you are in several conversations at once (for instance in a discussion bubble while sitting in the audience of a podium), clicking the button opens a list of those conversations:

- **Discussion bubble**: the people around you,
- **Megaphone**: the person speaking in the megaphone,
- the name of the meeting room or of the podium.

Click a conversation to raise your hand there. A highlighted line means your hand is already up in that conversation: click it again to lower it.

<!-- TODO screenshot: Choosing where to raise your hand -->

## What others see

When you raise your hand, the people in that conversation see:

- a hand next to your name, above your Woka on the map,
- your name in green on your video, with a hand badge. When several people raise their hand, the badge shows your position in the queue.

<!-- TODO screenshot: A raised hand on the map and on the video -->

In a discussion bubble or a meeting room, a **Raised hands** panel also opens in the top-right corner of everyone's screen. It lists the people with a raised hand, in the order they raised it, so whoever leads the discussion knows who is next.
On a podium or in the megaphone, only the speakers and the administrators see this panel (see [For speakers and moderators](#for-speakers-and-moderators)).

The panel only appears while at least one hand is raised. Click its title to fold it.

<!-- TODO screenshot: The "Raised hands" panel -->

## Lowering your hand

Click the **Raise your hand** button again to lower your hand.

Your hand is also lowered automatically when:

- you leave the conversation (you walk away from the bubble, you leave the meeting room or the audience),
- you are given the floor,
- you leave WorkAdventure.

Turning your microphone on or speaking does not lower your hand.

## For speakers and moderators

Administrators (users with the `admin` tag) can lower someone else's hand, in any conversation. In the **Raised hands** panel, they see:

- **Lower hand** next to each person,
- **Lower all** next to the panel title.

The person is told "A moderator lowered your hand".

### Giving the floor

When you are speaking on a podium or in the megaphone, the people in your audience who raised their hand appear in your **Raised hands** panel, with the same **Lower hand** and **Lower all** buttons.

Click **Give the floor** next to someone to let them speak to the whole audience. You can also find **Give the floor** in the "More actions" menu of their video.

- Their hand is lowered and they start streaming to the audience. Their microphone is not turned on for them: they are told "It's your turn to speak", and asked to enable their microphone if it is off.
- They appear in the **Speaking** section of the panel.
- Click **Take back the floor** to stop them. They can also click their green button to give the floor back.

Giving the floor only exists on podiums and in the megaphone. In a discussion bubble or a meeting room, everyone can already speak.
