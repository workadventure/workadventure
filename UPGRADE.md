# Upgrade Guide

This document provides instructions for upgrading WorkAdventure between versions.

## Upgrading from v1.27.2 to v1.27.3

### TURN Credentials Architecture Change (BREAKING CHANGE)

Version 1.27.3 introduces a significant architectural change in how TURN credentials are managed. The TURN credentials generation has been moved from the `back` service to the `play` service (pusher component).

#### What Changed

- **TURN credentials generation**: Now handled exclusively by the pusher service within the `play` container
- **Configuration location**: The `TURN_STATIC_AUTH_SECRET` environment variable must be moved from the `back` service to the `play` service
- **Backend cleanup**: The `WebRTCCredentialsService` has been completely removed from the back service

#### Why This Change Was Made

This change improves the separation of concerns by:
- Centralizing WebRTC configuration in the pusher layer, which directly handles client WebSocket connections
- Opening the door for future improvements, such as delegating ICE configuration to the Admin API
- Improving credential management with automatic renewal and better error handling

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

#### Rollback

If you need to rollback to v1.27.2:

1. Move `TURN_STATIC_AUTH_SECRET` back to the `back` service in your docker-compose configuration
2. Remove it from the `play` service
3. Redeploy with the v1.27.2 images

#### Additional Information

For more details about this change, see:
- Pull request description for the TURN credentials migration
- Commit: feat: Move TURN credentials management from back to pusher

---

## Need Help?

If you encounter any issues during the upgrade process:
1. Check the [GitHub Issues](https://github.com/workadventure/workadventure/issues) for similar problems
2. Review the browser console for specific error messages
3. Verify your TURN server configuration is correct
4. Ensure all environment variables are properly set
