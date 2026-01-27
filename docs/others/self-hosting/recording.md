# Meeting Recording

WorkAdventure supports recording meetings using [Livekit Egress](https://docs.livekit.io/egress-ingress/egress/overview/). 
Recordings are automatically uploaded to an S3-compatible storage bucket and can be viewed directly from within WorkAdventure.

## Prerequisites

Before enabling meeting recording, ensure you have:

1. **OpenID Connect (OIDC) authentication** configured. Users must be authenticated to start and access recordings.
   See the [OpenID Connect documentation](./openid.md) for setup instructions.

2. **A Livekit server** configured and connected to WorkAdventure. See the [Livekit documentation](https://docs.livekit.io/home/self-hosting/deployment/) for setup instructions.

3. **Livekit Egress** installed and configured on your Livekit server. Egress is a separate service that handles the actual recording.
   See the [Livekit Egress documentation](https://docs.livekit.io/transport/self-hosting/egress/) for installation instructions.

4. **An S3-compatible storage bucket** to store the recordings. This can be:
   - AWS S3
   - MinIO (self-hosted)
   - DigitalOcean Spaces
   - Cloudflare R2
   - Any other S3-compatible storage

## S3 Bucket Configuration

### Bucket Permissions

Your S3 bucket must have:
- **Read and write permissions** for the WorkAdventure back and play services (to save, list, serve and delete recordings)
- Does not need public access, as recordings are served via signed URLs

### Understanding the S3 Endpoints

WorkAdventure uses two endpoint configurations:

- **`LIVEKIT_RECORDING_S3_ENDPOINT`**: The S3 API endpoint used to upload and manage recordings. 
  In Docker or Kubernetes environments, this can be a private/internal URL (e.g., `http://minio:9000`).

- **`LIVEKIT_RECORDING_S3_CDN_ENDPOINT`** (optional): The public URL used to serve recordings to users' browsers.
  If your S3 endpoint is internal/private, set this to the publicly accessible URL of your S3 storage.
  If not set, WorkAdventure will use `LIVEKIT_RECORDING_S3_ENDPOINT` as the public URL.

## Environment Variables

Configure the following environment variables to enable recording:

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_RECORDING_S3_ENDPOINT` | Yes | The S3 API endpoint URL (e.g., `https://s3.amazonaws.com` or `http://minio:9000`) |
| `LIVEKIT_RECORDING_S3_CDN_ENDPOINT` | No | The public URL for serving recordings. Defaults to `LIVEKIT_RECORDING_S3_ENDPOINT` if not set |
| `LIVEKIT_RECORDING_S3_ACCESS_KEY` | Yes | The S3 access key ID |
| `LIVEKIT_RECORDING_S3_SECRET_KEY` | Yes | The S3 secret access key |
| `LIVEKIT_RECORDING_S3_BUCKET` | Yes | The S3 bucket name |
| `LIVEKIT_RECORDING_S3_REGION` | Yes | The S3 region (e.g., `us-east-1`, `eu-west-1`) |

## Configuration Examples

### Docker Compose

Add the following to your `.env` file:

```bash
#
# Meeting Recording (Livekit Egress)
#

# S3 endpoint for storing recordings
LIVEKIT_RECORDING_S3_ENDPOINT=https://s3.eu-west-1.amazonaws.com
# Public URL for serving recordings (optional, defaults to S3_ENDPOINT)
# LIVEKIT_RECORDING_S3_CDN_ENDPOINT=https://recordings.yourdomain.com
LIVEKIT_RECORDING_S3_ACCESS_KEY=your-access-key
LIVEKIT_RECORDING_S3_SECRET_KEY=your-secret-key
LIVEKIT_RECORDING_S3_BUCKET=workadventure-recordings
LIVEKIT_RECORDING_S3_REGION=eu-west-1
```

### Kubernetes (Helm)

Add the following to your `values.yaml`:

```yaml
commonSecretEnv:
  LIVEKIT_RECORDING_S3_ENDPOINT: "https://s3.eu-west-1.amazonaws.com"
  # LIVEKIT_RECORDING_S3_CDN_ENDPOINT: "https://recordings.yourdomain.com"
  LIVEKIT_RECORDING_S3_ACCESS_KEY: "your-access-key"
  LIVEKIT_RECORDING_S3_SECRET_KEY: "your-secret-key"
  LIVEKIT_RECORDING_S3_BUCKET: "workadventure-recordings"
  LIVEKIT_RECORDING_S3_REGION: "eu-west-1"
```

### MinIO Example (Self-Hosted)

If you're using MinIO for self-hosted S3-compatible storage:

```bash
# Internal MinIO endpoint (accessible from Docker/Kubernetes network)
LIVEKIT_RECORDING_S3_ENDPOINT=http://minio:9000
# Public MinIO endpoint (accessible from users' browsers)
LIVEKIT_RECORDING_S3_CDN_ENDPOINT=https://minio.yourdomain.com
LIVEKIT_RECORDING_S3_ACCESS_KEY=minioadmin
LIVEKIT_RECORDING_S3_SECRET_KEY=minioadmin
LIVEKIT_RECORDING_S3_BUCKET=workadventure-recordings
LIVEKIT_RECORDING_S3_REGION=us-east-1
```

## Verifying Your Configuration

Once configured:

1. Start or restart your WorkAdventure services
2. Log in to WorkAdventure with a user. Only logged in users with the `admin` or `recorder` tag can start recordings.
3. Join a bubble with another user
4. Click on the recording button in the action bar (video camera icon with a red dot)
5. The recording should start, and all participants will see a recording indicator
6. Stop the recording when done
7. Access your recordings from the recordings menu in the "apps" submenu of the action bar

Recordings are stored with the following path structure in your S3 bucket:
```
{user-uuid}/{recording-id}.mp4
```
