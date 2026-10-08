# Documentation screenshots

Each `<topic>.shots.ts` script drives the local stack and writes the screenshots of one doc page straight into `docs/`. Under each image, the page has a comment pointing back to its script:

```md
![](../images/editor/megaphone_menu.png)
<!-- screenshot: tests/docs-screenshots/megaphone.shots.ts -->
```

These are not tests: they sit outside the E2E `testDir`, so CI never runs them.

## Refreshing screenshots after a design change

From the repository root, with the local stack running and `DEBUG_MODE=false` on `play` (otherwise Phaser draws magenta physics boxes around every Woka):

```bash
DEBUG_MODE=false docker compose up -d --no-deps play   # back to the .env value afterwards: docker compose up -d --no-deps play
npx playwright test -c tests/docs-screenshots                 # every page
npx playwright test -c tests/docs-screenshots megaphone       # one page
```

Then `git status docs/` lists the images that changed. Look at each one before committing (a moved button may need its numbered badge adjusted in the script).

Scripts that show a camera need `ffmpeg` and read the image or clip from the folder in `WA_DOC_CAMERAS`. Use only images of people who agreed to appear in the public documentation.
