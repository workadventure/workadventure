# Onboarding: your own tips and announcements

WorkAdventure guides its users with a short tutorial on their first visit, tips on the following days, and a "What's
new" after an update. You can add your own items next to these, for instance a tour of a button your map scripts add
or an announcement about your office, and turn built-in ones off. Everything goes in one JSON file.

> [!WARNING]
> **Experimental.** The format of the file is not stable yet: it may change in incompatible ways from one minor version
> of WorkAdventure to the next. When you upgrade, read the release notes and check your file against the
> [JSON Schema](#checking-your-file) of the new version.

## Setting it up

1. Write the file. Start from the [example](#a-first-example) below.
2. Put it at a URL that browsers can fetch. Browsers load it from your WorkAdventure page, so its server must allow
   CORS: it must send an `Access-Control-Allow-Origin` header that covers your play domain (or `*`).
3. Set the `ONBOARDING_URL` environment variable of the play container to that URL:
   - with docker compose, add `ONBOARDING_URL=https://example.com/onboarding.json` to your `.env` file, then run
     `docker compose up -d` to recreate the play container;
   - with the Helm chart, set `play.env.ONBOARDING_URL` in your values, then upgrade the release.

The file applies to every room of your install. Changes to the file show up the next time a user enters a room, as far
as the caching headers of its server allow: there is no need to restart anything.

If you use an [Admin API](adminAPI.md), `ONBOARDING_URL` is not used: your admin gives the URL of each world's file in
the `onboardingUrl` field of the map details.

> [!CAUTION]
> The file is public: every user's browser downloads it, guests included, and filters the items there. Do not put
> anything secret in it.

## A first example

```json
{
    "$schema": "https://docs.workadventu.re/docs/schema/onboarding.json",
    "version": 1,
    "items": [
        {
            "id": "town-hall-2027",
            "kind": "announcement",
            "audience": { "guests": false },
            "when": { "expiresAt": "2027-01-15" },
            "steps": [
                {
                    "type": "modal",
                    "title": { "en-US": "Town hall on Friday", "fr-FR": "Réunion générale vendredi" },
                    "text": {
                        "en-US": "Join us in the **auditorium**, on the second floor, at 4 pm.",
                        "fr-FR": "Rendez-vous dans l'**auditorium**, au deuxième étage, à 16 h."
                    }
                }
            ]
        },
        {
            "id": "book-a-desk",
            "kind": "tour",
            "title": "Booking a desk",
            "when": { "minDaysSinceFirstVisit": 1 },
            "steps": [
                {
                    "type": "popover",
                    "anchor": "actionBar.custom.book-desk",
                    "skipIfUsed": "actionBar.custom.book-desk",
                    "text": "Coming to the office tomorrow? **Book a desk** here."
                }
            ]
        }
    ]
}
```

The first item tells logged-in users about a town hall when they enter a room, until January 15. The second one points,
from the day after a user's first visit, at a "Book a desk" button that your map script adds with
`WA.ui.actionBar.addButton({ id: "book-desk", … })`, and never to someone who already clicked it.

## The file

| Field | Required | |
|---|---|---|
| `$schema` | No | The URL of the JSON Schema, so that your editor checks the file as you write it. |
| `version` | Yes | Always `1`. |
| `quietPeriodMinutes` | No | No item starts by itself within this many minutes of the last one that did. From 0 to 10080 (a week). Defaults to 60. See [Pacing](#pacing). |
| `builtin` | No | The built-in items you turn off. See [Turning built-in items off](#turning-built-in-items-off). |
| `items` | No | Your items, in priority order. They come before the built-in ones. |

Every item is strict: a misspelled field makes its item invalid, instead of being silently ignored. A field this version
of WorkAdventure does not know at the top level or in `builtin` is ignored, with a warning. See
[Checking your file](#checking-your-file).

### Items

| Field | Required | |
|---|---|---|
| `id` | Yes | Unique and stable. WorkAdventure remembers, for each user, which items they saw, by id. Editing an item does not show it again to those who saw it; giving it a new id does. Ids cannot start with `wa.`, which is for built-in items. |
| `kind` | Yes | `announcement` or `tour`. See [Pacing](#pacing). |
| `title` | No | Its name in the Help menu, as a [text](#texts). Defaults to the first title of its steps. |
| `published` | No | `false` makes it a draft. See [Trying out an item](#trying-out-an-item-drafts). Defaults to `true`. |
| `audience` | No | Who gets it. See below. |
| `when` | No | When it starts. See below. |
| `steps` | Yes | What it shows, one step after the other. See [Steps](#steps). |

### Who gets an item: `audience`

All the conditions you set apply together.

| Field | |
|---|---|
| `tags` | The user has at least one of these tags. |
| `excludeTags` | The user has none of these tags. |
| `guests` | `true`: users who are not logged in only. `false`: logged-in users only. |
| `touch` | `true`: touch devices (phones, tablets) only. `false`: the others. |

On a self-hosted install, a user's tags come from your [OpenID Connect](openid.md) provider: the claim named by
`OPENID_TAGS_CLAIM` (`tags` by default).

### When an item starts: `when`

| Field | |
|---|---|
| `minDaysSinceFirstVisit` | Not before this many days after the user's first visit. Day 0 is the day of that first visit. |
| `maxDaysSinceFirstVisit` | Not after this many days. |
| `expiresAt` | A date (`2027-01-15`) or a date and time (`2027-01-15T18:00:00Z`). The item no longer starts after it. |
| `after` | Another item that must be over first, by id: `"after": "town-hall-2027"`. To also wait some time after it ended: `"after": { "item": "town-hall-2027", "minHours": 24 }`. |
| `onAnchor` | Start when this [anchor](#anchors) shows up instead of when the user enters the room: the first time they open the map editor, or are in a conversation. |

An item is over when the user finished it, closed it, or it was skipped. An item that can never show to the user (out
of their audience, expired, a draft, or missing from the file) also counts as over, so it does not hold back the items
that come `after` it. One case still waits: an item with an `onAnchor` that never shows up.

### Steps

There are two kinds of steps.

- `modal`: a window in the middle of the screen, with a "Next" button, or "Got it" on the last step. When a first
  modal is followed by other steps, its buttons are "Show me" and "Not now": an announcement that leads into a tour.
- `popover`: a bubble attached to an [anchor](#anchors), a button of the interface that it highlights.

| Field | Steps | |
|---|---|---|
| `type` | All | `modal` or `popover`. |
| `text` | All | The [text](#texts) of the step. Required. |
| `title` | All | A [text](#texts) above it. |
| `image` | All | The URL of an image above the text. |
| `video` | All | The URL of a video above the text, played muted, in a loop. |
| `skipIfUsed` | All | An [anchor](#anchors). The step never shows to someone who already used that button. An anchor this version does not know is ignored. |
| `anchor` | Popover | The [anchor](#anchors) the popover points at. Required. |
| `side` | Popover | `top`, `right`, `bottom` (the default) or `left` of the anchor. |
| `advance` | Popover | `next` (the default) shows a Next button. `click` does not: the user moves on by clicking the anchor. |

A click on the anchor always completes a popover step: a tip on the lock button closes when the user locks the
conversation. A tour can lead the user through menus that open one after the other: each step waits up to 10 seconds
for its anchor to show up, and if the user closes the menu, the tour goes back to the step whose button opens it.

An item whose first step is a popover only starts while that anchor is on screen. So a tour of the map editor never
starts for someone who cannot open it.

When every step of an item has a `skipIfUsed` that the user already used, the item is recorded as seen without showing
anything. Put `skipIfUsed` only on steps that the next steps do not depend on: skipping "Open the menu" leaves the menu
closed.

### Texts

A text (`text`, `title` of a step or of an item) is either one string for everyone or one string per locale:

```json
"text": { "en-US": "Welcome!", "fr-FR": "Bienvenue !", "de-DE": "Willkommen!" }
```

A user gets their locale (`fr-FR`), then another one of their language (`fr-CA`), then `en-US`, then the first one of
the list. None is mandatory.

The `text` of a step is Markdown: `**bold**`, lists, links, images. HTML is sanitized: anything that could run code is
removed.

- Links open in a new tab, so that users do not leave the room.
- An image whose file ends in `.mp4` or `.webm` plays as a muted looping video:
  `![The new meeting room](https://example.com/meeting-room.mp4)`.
- In a `modal`, a line with only `---` starts a new page, as in Markdown slides. The window turns the pages itself,
  with Previous and Next.

## Anchors

An anchor is an element of the WorkAdventure interface that a popover can point at, such as a button. Its id up to the
first dot says where it is.

<!-- anchors:start: generated by "npm run export-json-schema" in libs/messages -->

**Action bar** (`actionBar`)

| Anchor | |
|---|---|
| `actionBar.mapMenu` | Tools menu button |
| `actionBar.profileMenu` | Profile menu button |
| `actionBar.camera` | Camera button |
| `actionBar.microphone` | Microphone button |
| `actionBar.screenShare` | Screen sharing button |
| `actionBar.chat` | Chat button |
| `actionBar.emoji` | Emoji reactions button |
| `actionBar.lockBubble` | Lock conversation button (in a conversation) |
| `actionBar.pictureInPicture` | Picture-in-picture button (in a conversation) |

**Tools menu** (`mapMenu`)

| Anchor | |
|---|---|
| `mapMenu.editMap` | Map editor entry (in the Tools menu), for users who can edit the map |

**Map editor** (`mapEditor`)

| Anchor | |
|---|---|
| `mapEditor.tool.area` | Area tool |
| `mapEditor.tool.entity` | Furniture tool |
| `mapEditor.tool.exploration` | Explore the room tool |
| `mapEditor.entityList` | Object list |

**Tutorial** (`tutorial`)

| Anchor | |
|---|---|
| `tutorial.simulatedUser` | Video of the tutorial's fake user |

<!-- anchors:end -->

The list grows with each release. The JSON Schema, [`docs/schema/onboarding.json`](../../schema/onboarding.json), has
it under `$defs` → `BuiltinOnboardingAnchor`, and the areas under `$defs` → `OnboardingAnchorArea`. With `$schema`
set in your file, your editor [completes them](#checking-your-file) as you type.

Your map scripts' own buttons are anchors too: a button added with `WA.ui.actionBar.addButton({ id: "book-desk", … })`
is `actionBar.custom.book-desk`.

Some keyboard shortcuts count as using their button, for `skipIfUsed`: the chat shortcut for `actionBar.chat`, the
map editor one for `mapMenu.editMap`, and the emote keys for `actionBar.emoji`.

## Turning built-in items off

Everything built in is on by default. In `builtin`:

- `"announcements": false` turns off every "What's new" of WorkAdventure;
- `"disabledTours"` turns off built-in tours one by one, by id. For example, `wa.conversation.lockBubble` is the tip
  on the button that locks a conversation, and `wa.mapEditor.furniture` the tour that shows editors how to place
  furniture.

```json
"builtin": { "announcements": false, "disabledTours": ["wa.conversation.lockBubble"] }
```

The list of built-in tours grows with each release. It is in the JSON Schema,
[`docs/schema/onboarding.json`](../../schema/onboarding.json), under `$defs` → `BuiltinTourId`, with a description of
each tour. With `$schema` set in your file, your editor completes the ids as you type. A tour added in a later release
is on until you add its id to `disabledTours`. An id that a release removed is ignored, with a message in the browser
console.

The tutorial of the first visit has its own switch, the `ENABLE_TUTORIAL` environment variable.

## Pacing

WorkAdventure keeps items from piling up:

- Only one item shows at a time.
- After an item started by itself, no other one starts by itself for `quietPeriodMinutes` (60 minutes by default),
  even across visits. Built-in items and yours share this pause. Use `after` with `minHours` to space your own items on
  purpose.
- Announcements start as soon as the user enters a room. Tours wait until the user has been there for a while: 30
  seconds by default, set with the `ONBOARDING_START_DELAY` environment variable.
- Only the first pending announcement shows. The others are recorded as seen: someone back after a long time gets one
  announcement, not five.
- A user's first visit records as seen every announcement that exists at that moment: announcements are for people who
  already know the place. Use a tour to welcome newcomers.
- Each item shows once per user. Closing it with × or Esc counts as seen too.
- Every tip has a "Stop showing tips" link: after it, no tip starts by itself for that user, until they turn
  **Show tips automatically** back on in the Help menu. Announcements still show.

Users can replay any item of their audience from the menu: open their menu, then **All settings**, then
**Help & tutorials**. An item that cannot start there (its button only shows in a conversation, for example) is
greyed out, with a "Remind me" button that starts it when the button shows up.

What each user saw is stored in a player variable, `onboarding`: on the server for logged-in users, in the browser for
guests.

## Trying out an item: drafts

Set `"published": false` on an item to try it out before your users see it. A draft never starts by itself. It is
listed in the Help menu only for users with the `admin` tag, whatever its `audience`: open it from there, check it, fix
the file, then remove `published` (or set it to `true`) to publish it.

Keep the same `id` while you work on a draft. Once an item is published, change its `id` only if you want everyone to
see it again.

## Checking your file

- Add `"$schema": "https://docs.workadventu.re/docs/schema/onboarding.json"` at the top of the file: editors such as
  VS Code then check it as you type, and complete the field names and anchors.
- WorkAdventure checks each item on its own. An invalid item is left out, and the others still show. The browser
  console (F12) says which items were left out and why, in lines that start with "Onboarding of this world".
- If the file cannot be loaded (wrong URL, missing CORS header, invalid JSON), the browser console says so, and only
  the built-in items show.
- At the top level and in `builtin`, a field this version of WorkAdventure does not know is ignored, with a warning in
  the browser console, so an older WorkAdventure can read a file written for a newer one. In an item, such a field
  makes the whole item ignored, with a warning naming the field: an older WorkAdventure does not show the item to
  people a newer field would exclude. The JSON Schema flags unknown fields everywhere, to catch typos.
