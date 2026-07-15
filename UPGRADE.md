# Upgrade Guide

This document provides instructions for upgrading WorkAdventure between versions.

## Upgrading to the generic analytics pipeline (develop)

The pusher (`play` service) now ships a unified analytics queue and drains it on
`SIGTERM` / `SIGINT` before exiting. This is a behaviour change to keep in mind
when configuring orchestrator shutdown timings:

- **Kubernetes**: the pusher honours up to `ANALYTICS_DRAIN_TIMEOUT_MS` (default
  30 000 ms) per queue when receiving `SIGTERM`. Make sure
  `terminationGracePeriodSeconds` on the `play` Deployment is at least the sum
  of `ANALYTICS_DRAIN_TIMEOUT_MS + VIDEO_ANALYTICS_DRAIN_TIMEOUT_MS` plus a few
  seconds of headroom (35–45 s is safe with defaults). Setting it lower will
  cause the orchestrator to send `SIGKILL` while events are still being flushed,
  silently dropping any events that had not reached admin yet.
- **Docker / docker-compose**: `stop_grace_period` should be raised to at least
  `40s` for the `play` service.

If your admin does not advertise the new `api/analytics/events-batch`
capability, the legacy `video-quality-batch` endpoint keeps being used and the
generic queue is idle — no further configuration is required.

New optional environment variables (all have safe defaults):

| Variable                                 | Default          | Purpose                                          |
|------------------------------------------|------------------|--------------------------------------------------|
| `VIDEO_ANALYTICS_FLUSH_INTERVAL_MS`      | `10000`          | Interval in ms between analytics batch flushes.   |
| `ANALYTICS_DRAIN_TIMEOUT_MS`             | `30000`          | Max time `SIGTERM` drains the generic queue.     |
| `VIDEO_ANALYTICS_DRAIN_TIMEOUT_MS`       | `30000`          | Same as above for the legacy video-quality queue.|

As the flush interval above suggests, the generic analytics queue reuses the
existing video-quality settings rather than defining its own: its HTTP timeout,
queue size and batch size likewise come from `VIDEO_ANALYTICS_TIMEOUT_MS`
(2 000 ms), `VIDEO_ANALYTICS_MAX_QUEUE_SIZE` (10 000) and
`VIDEO_ANALYTICS_MAX_BATCH_SIZE` (1 000). Tuning either queue therefore tunes
both; splitting them into dedicated `ANALYTICS_EVENTS_*` variables is left for a
follow-up.

## Upgrading from v1.27.2 to v1.27.3

### TURN Credentials Architecture Change (BREAKING CHANGE)

Version 1.27.3 introduces a significant architectural change in how TURN credentials are managed. The TURN credentials generation has been moved from the `back` service to the `play` service (pusher component).

#### Migration Steps

##### For Docker Compose Deployments

If you are using `contrib/docker/docker-compose.prod.yaml` or a similar Docker Compose setup:

1. **Locate your `TURN_STATIC_AUTH_SECRET` configuration**
   
   In your `.env` file or environment configuration, you should have:
   ```bash
   TURN_STATIC_AUTH_SECRET=your-secret-here
   ```

2. **Update your docker-compose configuration**

   **Before (v1.27.2 and earlier):**
   ```yaml
   services:
     play:
       environment:
         - TURN_SERVER
         - TURN_USER
         - TURN_PASSWORD
         # TURN_STATIC_AUTH_SECRET was NOT here
         - STUN_SERVER
     
     back:
       environment:
         - TURN_SERVER
         - TURN_USER
         - TURN_PASSWORD
         - TURN_STATIC_AUTH_SECRET  # ← Was configured here
         - STUN_SERVER
   ```

   **After (v1.27.3 and later):**
   ```yaml
   services:
     play:
       environment:
         - TURN_SERVER
         - TURN_USER
         - TURN_PASSWORD
         - TURN_STATIC_AUTH_SECRET  # ← Now configured here
         - STUN_SERVER
     
     back:
       environment:
         - TURN_SERVER
         - TURN_USER
         - TURN_PASSWORD
         # TURN_STATIC_AUTH_SECRET removed from back
         - STUN_SERVER
   ```

3. **Keep your `.env` file unchanged**

   Your `.env` file does not need to be modified. The `TURN_STATIC_AUTH_SECRET` value remains the same:
   ```bash
   TURN_STATIC_AUTH_SECRET=your-secret-here
   ```

4. **Restart your services**

   After updating your docker-compose configuration:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

##### For Kubernetes or Other Deployments

If you are using Kubernetes, Helm, or another deployment method:

1. **Remove `TURN_STATIC_AUTH_SECRET` from the back service**
   - Remove the environment variable from your back service/deployment configuration

2. **Add `TURN_STATIC_AUTH_SECRET` to the play service**
   - Add the environment variable to your play service/deployment configuration
   - Use the same secret value you were using previously

3. **Redeploy both services**
   - Deploy the updated back service configuration
   - Deploy the updated play service configuration

#### Verification

After upgrading, verify that TURN credentials are working correctly:

1. Open your WorkAdventure instance in a browser
2. Join a room with another user
3. Enable video/audio communication
4. Check the browser console for any WebRTC-related errors
5. Verify that peer-to-peer connections are established successfully

If you see errors related to TURN credentials or ICE servers, double-check that:
- The `TURN_STATIC_AUTH_SECRET` is present in the `play` service environment
- The `TURN_SERVER` configuration is correct
- The play service has been restarted after the configuration change

#### Additional Information

For more details about this change, see:
- [Pull request description for the TURN credentials migration](https://github.com/workadventure/workadventure/pull/5361)

