# Self-hosting WorkAdventure using Kubernetes Helm chart

> [!WARNING]
> If you haven't already, please check the [Setting up a self-hosted production environment](../../docs/others/self-hosting/install.md) guide
> before getting started.

This Helm chart deploys Workadventure on Kubernetes.

## Installation

    helm repo add workadventure https://charts.workadventu.re/
    helm install workadventure workadventure/workadventure

## Version numbering and upgrading

Versions of the Helm chart are aligned with the versions of the WorkAdventure Docker image. 
When a new version of the WorkAdventure Docker images are released, a new version of the Helm chart is released as well.

> [!WARNING]
> This Helm chart is newer than the [Docker Compose install](../docker/README.md) and might change more frequently in the 
> coming month. Therefore, we do not (yet) guarantee the absence of breaking changes between minor or patch versions.
> When upgrading, please check changes in `values.yaml`. We will try to document breaking changes in the 
> [release notes](https://github.com/workadventure/workadventure/releases).


## Configuration

The chart is designed to work out of the box with the minimum required configuration.

The two compulsory parameters you need to provide are:
- the `domainName` parameter that should point to the domain name that will host WorkAdventure.
- the `m̀apstorage.secretEnv.AUTHENTICATION_PASSWORD` parameter that you should set to a password to access the map-storage container.

> [!NOTE]
> Please note that this chart does not provide SSL certificates generation by default.
> It is your responsibility to ensure certificates are correctly handled (either by providing
> one in an appropriate secret, by using CertManager to generate certificates automatically
> or by using Traefik as a reverse proxy properly configured to generate certificates).

For each pod, there is a corresponding `xxx.env` entry in the `values.yaml` file (that will map to a `ConfigMap`),
and a `xxx.secretEnv` entry (that will map to a `Secret`). There are many pre initialized variables in the template files
(all variables relative to the URLs). Additional entries can be easily added in the corresponding 
sections of the values file.

Furthermore, the `commonEnv` and `commonSecretEnv` sections can be used to add environment variables in all pods.

If you don't provide a `secretKey` (used to encode JWT tokens), the image will generate one for you.


For a complete reference of all available environment variables, see the [Environment Variables documentation](../../docs/others/self-hosting/env-variables.md) or use the original [docker-compose file](../docker/docker-compose.prod.yaml) for reference. Look at the [original configuration template](../docker/.env.prod.template) for more information about the available variables.

### Minimal sample configuration file

Assuming you are using the nginx ingress controller, and CertManager for the SSL certificates (with a cluster issuer named `letsencrypt-prod`), here is a minimal configuration file:

**values.yaml**
```yaml
domainName: example.com

singleDomain: true

ingress:
  enabled: true
  className: "nginx"
  tls: true
  secretName: "workadventure-cert"
  annotationsRoot:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  annotationsPath:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"

commonSecretEnv:
  # Secret token to connect to the map storage API.
  MAP_STORAGE_API_TOKEN: "123"

mapstorage:
  env:
    # Enable Bearer authentication for the map storage API so that we can connect using "npm run upload" in the map-starter-kit
    ENABLE_BEARER_AUTHENTICATION: "true"
  secretEnv:
    AUTHENTICATION_PASSWORD: "my-password"
```

### Gateway API configuration

As an alternative to Ingress, you can use the Gateway API for traffic routing. The Gateway API provides more advanced traffic management capabilities and is the next-generation standard for Kubernetes traffic routing.

> [!NOTE]
> Gateway API and Ingress are mutually exclusive. You should enable only one of them.

**Gateway API example values.yaml:**
```yaml
domainName: example.com

singleDomain: true

# Disable ingress when using Gateway API
ingress:
  enabled: false

# Enable Gateway API
gateway:
  enabled: true
  gatewayClassName: "istio"  # Use your Gateway API implementation
  createGateway: true
  tls: true
  secretName: "workadventure-cert"

commonSecretEnv:
  # Secret token to connect to the map storage API.
  MAP_STORAGE_API_TOKEN: "123"

mapstorage:
  env:
    # Enable Bearer authentication for the map storage API so that we can connect using "npm run upload" in the map-starter-kit
    ENABLE_BEARER_AUTHENTICATION: "true"
  secretEnv:
    AUTHENTICATION_PASSWORD: "my-password"
```

#### Gateway API configuration options

The following configuration options are available for Gateway API:

- `gateway.enabled`: Enable Gateway API support (boolean, default: false)
- `gateway.gatewayClassName`: Gateway class to use (string, required when gateway.enabled is true)
- `gateway.gatewayName`: Name of existing Gateway resource to use (string, optional)
- `gateway.gatewayNamespace`: Namespace of existing Gateway resource (string, optional)
- `gateway.createGateway`: Whether to create a Gateway resource (boolean, default: true)
- `gateway.tls`: Enable TLS/HTTPS (boolean, default: false)
- `gateway.secretName`: Secret containing TLS certificates (string, required when tls is true)
- `gateway.listeners`: Custom listener configuration for the Gateway (array, optional)
- `gateway.annotations`: Annotations for HTTPRoute resources (object, optional)
- `gateway.labels`: Labels for HTTPRoute resources (object, optional)

#### Using an existing Gateway

If you already have a Gateway resource deployed, you can reference it instead of creating a new one:

```yaml
gateway:
  enabled: true
  createGateway: false
  gatewayName: "my-existing-gateway"
  gatewayNamespace: "gateway-system"
```

#### Gateway API implementations

Popular Gateway API implementations include:
- **Istio Gateway Controller**
- **NGINX Gateway Fabric**
- **Envoy Gateway**
- **Kong Gateway Operator**
- **Traefik (experimental)**

Each implementation may have specific requirements for the `gatewayClassName` and listener configuration.

## Upload your map

Before starting using WorkAdventure, you will need to upload your first map.

#### Uploading from the map starter kit

Design your own map using the [map starter kit](https://github.com/workadventure/map-starter-kit).
When you are happy with the result, [follow the steps in the "upload your map documentation"](https://docs.workadventu.re/map-building/tiled-editor/publish/wa-hosted)

From the starter-kit web-based interface, you can upload your map directly to your self-hosted instance.
You will need to provide the URL of your map storage API and the API token you configured in the `values.yaml` file (see `commonSecretEnv.MAP_STORAGE_API_TOKEN`).

#### Checking everything worked

Open your browser and go to `https://<your-domain>/map-storage/` (or `https://map-storage.<your-domain>` if you are 
using `singleDomain: false` in `values.yaml`).

You will be asked to authenticate. Use the credentials you configured in the `.env` file.

> **Note**
> Right now, authentication is limited to a single user credential in the map-storage container,
> hard coded in the `.env` file. This is not ideal, but works for now (the map-storage container
> is quite new). Contributions are welcome if you want to improve this.

You should see a link to the map you just uploaded.

Are you connected? Congratulations! Share the URL with your friends and start using WorkAdventure!

## Additional Configuration

### Enabling LiveKit server

This chart can deploy a LiveKit server (using the upstream `livekit/livekit-server` chart) and wire WorkAdventure `back` automatically.

The alternative is to deploy LiveKit separately, in a different namespace / cluster or on a dedicated VM. This chart
will help you getting started. If you are getting serious and installing large deployments, we recommend you to deploy 
LiveKit separately and connect it to WorkAdventure by setting the appropriate environment variables in `back` (`LIVEKIT_HOST`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`).


> [!WARNING]
> LiveKit has infrastructure constraints that are stricter than standard HTTP services. Before enabling it:
> - Do not use a serverless or private Kubernetes cluster. LiveKit documents these as unsupported because additional NAT layers break WebRTC traffic.
> - LiveKit media requires direct network access (host networking model), so plan node capacity accordingly (typically one LiveKit pod per node).
> - Open and route LiveKit media ports correctly (UDP/TCP), in addition to HTTPS signaling.
> - In cloud environments, nodes must be publicly reachable for media traffic (public IP or equivalent external routing/load balancer setup compatible with LiveKit host networking).
>
> See LiveKit docs: [Kubernetes](https://docs.livekit.io/transport/self-hosting/kubernetes/), [Deployment](https://docs.livekit.io/transport/self-hosting/deployment/), [Ports and firewall](https://docs.livekit.io/transport/self-hosting/ports-firewall/).

When enabled:
- `LIVEKIT_HOST` is injected in `back` (unless you already set it manually in `commonEnv`, `back.env`, `commonSecretEnv` or `back.secretEnv`).
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are injected in `back` from a dedicated credentials secret (unless you already set them manually).
- If no credentials are provided, they are generated once and reused on upgrades.
- By default, LiveKit shares the WorkAdventure Redis instance using a dedicated alias service and Redis DB `2`.
- By default, a dedicated LiveKit ingress is created (`livekit.<domain>`), reusing root ingress defaults (`ingress.className`, `ingress.annotationsRoot`, `ingress.tls`, `ingress.secretName`).

**Sample configuration:**

```yaml
livekit:
  enabled: true
```

This is enough for the default setup:
- credentials are auto-generated and persisted.
- LiveKit shares WorkAdventure Redis with DB `2`.
- a dedicated ingress is created on `livekit{{ domainNamePrefix }}{{ domainName }}`.

`livekit.ingress.domainName` controls the hostname of the WorkAdventure-managed LiveKit ingress.
`livekit.host` controls the URL injected as `LIVEKIT_HOST` in WorkAdventure `back`.
By default, `livekit.host` is computed from `livekit.ingress.domainName` (or its default). Override `livekit.host` only when `back` must reach LiveKit through another URL (for example an external proxy/CDN URL).

Example overriding only non-default values:

```yaml
livekit:
  enabled: true
  ingress:
    domainName: "livekit.example.com"
    annotations:
      cert-manager.io/cluster-issuer: "letsencrypt-prod"
  # Optional when different from ingress host:
  # host: "https://livekit-api.example.com"
```

To use another Redis setup, override `livekit-server.livekit.redis` entirely (address, db, auth...).

To use another ingress setup, override `livekit.ingress.*`.
If you prefer the ingress mode of the upstream `livekit-server` chart, set `livekit-server.loadBalancer.type` accordingly and disable the WorkAdventure LiveKit ingress (`livekit.ingress.enabled=false`).

If you already manage credentials outside this chart, set `livekit.credentials.manageSecret: false` and point `livekit-server.storeKeysInSecret.existingSecret` to your secret.
That secret must expose `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and the key file configured in `livekit-server.livekit.key_file`.

### TURN TLS certificate (cert-manager)

You can ask the WorkAdventure chart to generate a cert-manager `Certificate` for LiveKit TURN TLS.

```yaml
livekit:
  enabled: true
  turnCertificate:
    enabled: true
    # Optional when livekit-server.livekit.turn.secretName is set.
    secretName: "livekit-turn-tls"
    # Optional when livekit-server.livekit.turn.domain is set.
    commonName: "turn.example.com"
    issuerRef:
      name: "letsencrypt-prod"
      kind: "ClusterIssuer"
      group: "cert-manager.io"

livekit-server:
  livekit:
    turn:
      enabled: true
      domain: "turn.example.com"
      tls_port: 5349
      secretName: "livekit-turn-tls"
```

> [!NOTE]
> The LiveKit TURN server is only used internally by LiveKit. It cannot be used as a TURN server for WorkAdventure (for conversations where there are less than 4 people). The TURN variables used by WorkAdventure (`TURN_SERVER`, `TURN_USER`, `TURN_PASSWORD`, `TURN_STATIC_AUTH_SECRET`) still need to point to a valid Coturn server.

### Enabling meeting recording (LiveKit Egress)

WorkAdventure supports recording meetings using LiveKit Egress. Recordings are stored in an S3-compatible storage bucket.

To enable this feature:
- enable LiveKit server (`livekit.enabled=true`)
- enable LiveKit egress (`livekit.egress.enabled=true`)
- set `livekit.credentials.apiKey` and `livekit.credentials.apiSecret`
- set `livekit-egress.egress.api_key` and `livekit-egress.egress.api_secret` to the same values
- provide recording S3 credentials in `commonSecretEnv`

By default:
- `livekit-egress.egress.ws_url` points to `ws://workadventure-livekit-server:80` (a service alias managed by this chart)
- `livekit-egress.egress.redis.address` points to `workadventure-livekit-redis:6379` with DB `2`

See the [Meeting Recording documentation](../../docs/others/self-hosting/recording.md) for detailed setup instructions.

**Sample configuration:**

```yaml
livekit:
  enabled: true
  egress:
    enabled: true
  credentials:
    # The egress chart requires explicit values.
    apiKey: "my-livekit-key"
    apiSecret: "my-livekit-secret"

livekit-egress:
  egress:
    api_key: "my-livekit-key"
    api_secret: "my-livekit-secret"

commonSecretEnv:
  LIVEKIT_RECORDING_S3_ENDPOINT: "https://s3.eu-west-1.amazonaws.com"
  LIVEKIT_RECORDING_S3_ACCESS_KEY: "your-access-key"
  LIVEKIT_RECORDING_S3_SECRET_KEY: "your-secret-key"
  LIVEKIT_RECORDING_S3_BUCKET: "workadventure-recordings"
  LIVEKIT_RECORDING_S3_REGION: "eu-west-1"
```
