# Release notes ("What's new")

Each minor release greets existing users with a "What's new in WorkAdventure X.Y" modal when they enter a room. Its
text is one Markdown file per locale: `play/announcements/<version>/<locale>.md`.

## In a feature PR

A PR that adds or changes something users will notice adds it to the notes of the upcoming minor version:

1. Find the version: the latest release tag, with the minor version bumped.

   ```bash
   git fetch --tags
   git tag --list 'v[0-9]*' --sort=-v:refname | head -1
   ```

   `v1.35.1` means the notes go in `play/announcements/1.36/`. Patch releases have no notes of their own: a feature
   that ships in a patch release is announced with the next minor.

2. Create `play/announcements/<version>/en-US.md` if it does not exist yet, or add a bullet to it. English only: the
   other locales are translated before the release, and show the English text until then.
3. Do not add the version to `builtinItems.ts`. Releases, patch releases included, are tagged from master: once
   registered, the next release would show the unfinished notes, and the users who saw them would never see the
   final ones, because the announcement is shown once per version.

What to write:

- One bullet per feature, written for users, not developers: what they can do now, in their words. Start with the
  feature in bold: `- **Drag the map** to look around, without moving your Woka.`
- The features users will notice most come first. Keep the list short: the blog article has the details.
- Only what users of every WorkAdventure server get: no bug fixes, no refactoring, nothing that only exists on the
  hosted version.
- A screenshot or a short video helps. Put the file next to the Markdown, in `play/announcements/<version>/`, and
  write its name: `![What it shows](my-feature.webp)`. A `.mp4` or `.webm` file written this way plays as a muted
  looping video. Keep it small, a few hundred KB: re-encode a video to 640 px wide with `ffmpeg`. A screenshot of the
  English interface does for every locale.
- Links open in a new tab.

## When releasing X.Y

1. Translate the notes: `cd play && npm run i18n:diff` lists the missing files, and the translate skill fills them.
2. Add the link to the blog article, if there is one, at the end of each file.
3. Register the version at the top of the release notes in `play/src/front/Onboarding/builtinItems.ts`:
   `releaseNotes("X.Y")`. Only the first pending announcement shows, so the newest release comes first.
