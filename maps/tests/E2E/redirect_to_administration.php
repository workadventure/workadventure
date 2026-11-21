<?php
// Like the pusher's /profile-callback, which sends the Profile menu's iframe to the administration
// (tests/tests/desktop_navigation.electron.ts).
header("Location: http://admin.workadventure.localhost/profile", true, 302);
