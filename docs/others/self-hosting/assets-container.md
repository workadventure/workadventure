# Separate assets container

This setup is optional. By default, the `play` container serves everything: the web page, the WebSocket API and
the JS/CSS assets. Nothing needs to change in an existing docker-compose or Helm installation.

You can serve the assets from a separate "front" container instead. The front can then be upgraded on its own,
without restarting `play` and disconnecting every user. The Helm chart supports it with `front.enabled=true`.

## How it works

- The "front" image is built from `play/Dockerfile` with `--target front`. It is an nginx server with the output
  of the front build. It keeps the hashed files of the previous images for 60 days, so pages opened with an older
  version can still load their files.
- `play` gets two environment variables:
  - `ASSETS_URL`: the public URL of the front container, for instance `https://assets.example.com`. The page loads its
    JS and CSS from there.
  - `ASSETS_INTERNAL_URL`: the URL `play` uses to reach the front container, for instance `http://front`. It defaults to
    `ASSETS_URL`.
- `play` still renders the page. It fetches the `index.html` template from `ASSETS_INTERNAL_URL` every 30 seconds.
  Until the first template is loaded, `/ready` returns 503. Use `/ready` as a readiness probe, and keep `/ping` as
  the liveness probe.
- `play` ignores a template built for another version of the WebSocket protocol. In that case it keeps serving the
  previous one and logs an error. A front upgrade that changes the protocol must be deployed together with `play`.

## Files that must stay on the play domain

Some files of the front container must be served from the same domain as the page: the service workers, `iframe_api.js`
(maps load it from the play domain) and the `static/`, `resources/` and `collections/` folders.

When `ASSETS_URL` is set, `play` proxies these paths to the front container. For better performance, route them
directly to the front container in your reverse proxy or ingress, on every domain that serves the page:

| Path | Match | Target |
| --- | --- | --- |
| `/assets/`, `/static/`, `/resources/`, `/collections/` | Prefix | front |
| `/iframe_api.js`, `/iframe_api.js.map`, `/service-worker-prod.js`, `/notification-service-worker.js` | Exact | front |

The Helm chart adds these rules to the play Ingress when `front.enabled=true`. With Traefik rules instead of an Ingress,
give the rule an explicit low priority: Traefik's default priority is the length of the rule, so a long path rule
could otherwise take requests away from more specific routes on other domains.
