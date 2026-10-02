---
sidebar_position: 15
---

# Moderating chat rooms

This page explains how to moderate a [Matrix chat room](/user/chat#matrix-chat-rooms): roles, removing or banning a
participant, deleting messages and changing what each role is allowed to do.

:::note
Moderation only applies to Matrix chat rooms. The Proximity Chat has no moderator: messages are not stored and only
the people in the bubble can read them.
:::

## Roles

Every participant of a chat room has one of three roles:

| Role          | Usual rights                                                                                  |
|---------------|-----------------------------------------------------------------------------------------------|
| **Admin**     | Everything, including changing permissions, giving roles and inviting people.                 |
| **Moderator** | Kick and ban participants, delete other participants' messages, rename the room.              |
| **User**      | Send messages and reactions, delete their own messages.                                       |

The person who creates a room is its **Admin**.

These are the usual rights. Each room can change them in its [permissions](#permissions).

Roles are **ordered**: you can only act on someone whose role is **lower** than yours. A Moderator can kick a User,
but cannot kick another Moderator or an Admin. An Admin cannot kick or demote another Admin.

:::info Matrix power levels
Roles are a simplified view of Matrix power levels: **User** is 0, **Moderator** is 50 and **Admin** is 100.
:::

## The room panel

Open a chat room, then click the **ⓘ** button at the top right of the conversation. The panel has four sections:
**Participants**, **Threads**, **Polls** and **Settings**.

**Participants** lists the people who joined the room, with their role. This list is read-only. To act on a
participant, use the **Manage participants** window described below.

## Managing participants

In the room list, hover over the room and click the **⋯** button next to its name, then choose **Participants**.
The **Manage participants** window opens. You can also open it with the **Invite** button of the room panel.

Everyone can open this window and see the list of participants with their status: **Joined**, **Invited**, **Left**
or **Banned**. The buttons next to each participant only appear if you are allowed to use them.

### Inviting people

Only Admins see the **Invitations** field. Type a name or a Matrix ID, then click **Send invitations**.

When a participant has left the room, an **Invite** button appears next to their name to invite them again.

### Kicking someone

Click **Kick** next to a participant. They are removed from the room immediately. They can come back later, for example
if someone invites them again.

### Banning someone

Click **Ban** next to a participant. They are removed from the room and **cannot come back**, even if someone invites
them, until they are unbanned.

Banned participants stay in the list with the **Banned** status. Click **Unban** to lift the ban. Unbanning does not
bring them back to the room: they need to be invited again.

:::caution
Kicking or banning someone from a chat room only applies to that chat room. The person can still enter your world and
use other rooms.

To prevent someone from entering your world, see [Moderation](/admin/moderation) in the admin documentation.
:::

### Changing someone's role

Only Admins can change roles. Pick a new role in the drop-down list next to a participant who has joined the room.
You can give a role up to your own: an Admin can make someone else an Admin.

:::caution
An Admin cannot demote another Admin. Make sure you trust someone before you make them an Admin.
:::

## Deleting messages

Hover over a message and click the trash icon. The message is replaced with a "Message deleted" notice for everyone.

- Everyone can delete their own messages (if the room allows it).
- Moderators and Admins can delete messages from participants with a lower role.

Polls work the same way: their author, or a participant with a higher role, can delete them.

## Room settings and permissions

Open the room panel and go to **Settings**. If your role does not allow any change, the settings are shown read-only.

The **Settings** section lets you change:

- **Name** and **Topic** of the room.
- **Access**:
  - **Invite only**: people can only join if they are invited.
  - **Restricted**: anyone who is a member of the parent folder can join. This option is only available when the room
    is in a folder.
- **Who can read history**, with the same options as when [creating a room](/user/chat#creating-a-chat-room).

Encryption cannot be changed after the room is created.

### Permissions

The **Permissions** list sets the minimum role (User, Moderator or Admin) needed for each action:

- **Send messages**, **Send reactions**
- **Delete own messages**, **Delete messages from others**
- **Kick users**, **Ban users**, **Invite users**
- **Change room name**, **Change room topic**, **Change history visibility**, **Change access**
- **Change permissions**: who can edit this list and give roles to other participants.
- **Change settings**: every other room setting that is not listed above.

The starting values depend on how the room was created. Check them in this list rather than assuming a default.

For example, to make an announcement room where only moderators can write, set **Send messages** to **Moderator**.

Click **Save** to apply the changes. Only people allowed to **Change permissions** can edit this list.

## Folders

Folders have participants too. If you are allowed to invite, kick or ban in a folder, open the folder menu (**⋯**) and
choose **Participants**. Removing someone from a folder does not remove them from the rooms in this folder.

:::info
If you are using the SaaS version of WorkAdventure, administrators can create chat rooms whose members and moderators
are [set automatically from user tags](/admin/chat/matrix-admin-managed-rooms).
:::
