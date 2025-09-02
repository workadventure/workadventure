---
sidebar_position: 100
---

# Troubleshooting

## MacOS users

Unlike with Windows and Linux, MacOS developers need to configure an amount of RAM dedicated
to Docker. If some containers are "Killed", you will need to increase the amount of RAM given
to Docker. At least 6GB of RAM is needed.

If the performance is poor, you can also try to [run WorkAdventure inside Vagrant](vagrant.md).

## Windows users

If you find errors in the docker logs that contain the string "\r", you have an issue with your Git configuration.
On Windows, Git can be configured to change the carriage return from "\n" to "\r\n" on the fly. Since the code
is running in Linux containers, you absolutely want to be sure the Git won't do that. For this, you need to
disable the `core.autocrlf` settings.

If you run into this issue, please run the command:

```console
git config --global core.autocrlf false
```

Then, delete the WorkAdventure directory and check it out again.

## CORS error / HTTP 502 error

If you see a CORS error or an HTTP 502 error when trying to load WorkAdventure, check the logs from the `play`
and from the `back` container. If you see an error, you can simply try to restart them.
Sometimes, a rare race condition prevents those containers from starting correctly in dev.

```console
docker-compose restart play
docker-compose restart back
```

## Increasing the log level

WorkAdventure uses the ["debug" package](https://github.com/debug-js/debug) to manage
configurable log levels.

In the front container, if you want to increase the log level, you need set the "debug" key of your localstorage:

```js
localStorage.debug = "*";
```

See https://github.com/debug-js/debug#browser-support

On the server-side, logs are sent to stdout so they will appear in your containers.
To enable "debug" log level, add a `DEBUG` environment variable:

```dotenv
DEBUG: *
```

## STUN/TURN issues

To verify that your STUN/TURN server is working properly, you can use
[TrickleIce](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/).

If you have configured a static auth secret for TURN, you can use the script
[`compute_turn_credentials.sh`](https://github.com/workadventure/workadventure/tree/develop/contrib/tools/compute_turn_credentials.sh)
to compute a timeboxed username and password.

Enabling TURN-related debug messages might also help: In a Chromium-like
browser, enter the following in the JavaScript console and reload
Workadventure:

```
localStorage.debug="CheckTurn"
```

You might also want to take a look at `chrome:webrtc-internals` (Chromium-like)
or `about:webrtc` (Firefox) while debugging ICE candidate gathering.
