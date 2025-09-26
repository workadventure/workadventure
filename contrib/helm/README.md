# Self-hosting WorkAdventure using Kubernetes Helm chart

> [!WARNING]
> If you haven't already, please check the [Setting up a self-hosted production environment](../../docs/others/self-hosting/install.md) guide
> before getting started.

This Helm chart deploys Workadventure on Kubernetes.

In addition, you will still need to provide a few services (Livekit, Jitsi, Coturn, Synapse) and configure them to work with WorkAdventure.

Note: This Helm chart optionally provides support for a Livekit deployment as a sub-chart.

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

Please use the original [docker-compose file](../docker/docker-compose.prod.yaml) for reference. Look at the [original configuration template](../docker/.env.prod.template) for more information about the available variables.

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

## Upload your map

Before starting using WorkAdventure, you will need to upload your first map.

#### Uploading from the map starter kit

Design your own map using the [map starter kit](https://github.com/workadventure/map-starter-kit).
When you are happy with the result, [follow the steps in the "upload your map documentation"](https://docs.workadventu.re/map-building/tiled-editor/publish/wa-hosted)

With the sample installation above, the command to upload your map will look like this:

```bash
npm run upload -- -u https://example.com/map-storage/ -k 123
```

#### Checking everything worked

Open your browser and go to `https://<your-domain>/map-storage/` (or `https://map-storage.<your-domain>` if you are 
using `singleDomain: false` in `values.yaml`).

You will be asked to authenticate. Use the credentials you configured in the `.env` file.

> [!NOTE]
> Right now, authentication is limited to a single user credential in the map-storage container,
> hard coded in the `.env` file. This is not ideal, but works for now (the map-storage container
> is quite new). Contributions are welcome if you want to improve this.

You should see a link to the map you just uploaded.

Are you connected? Congratulations! Share the URL with your friends and start using WorkAdventure!

## Deploying Livekit as part of the WorkAdventure deployment

Livekit is a SFU server. Its role is to manage the audio and video streams of the participants in a WorkAdventure room.
It is used when the number of participants in a bubble or meeting room is greater than 4.

The WorkAdventure Helm chart provides an option to deploy Livekit as part of the WorkAdventure deployment.
Before you proceed, please note not all Kubernetes clusters are suitable for running Livekit.

> [!WARNING]
> LiveKit does not support deployment to serverless and/or private clusters. Private clusters have additional layers 
> of NAT that make it unsuitable for WebRTC traffic.
> See https://docs.livekit.io/home/self-hosting/kubernetes/ for details.

To deploy Livekit as part of the WorkAdventure deployment, set the `livekitServer.enabled` value to `true` in the `values.yaml` file.

Depending on your Kubernetes cluster, you may need additional software (like a Nginx Ingress controller Cert-manager to handle HTTPS certificates).

All configuration options from the Livekit Helm chart are available in the `livekitServer` section of the `values.yaml` file.

> [!NOTE]
> Pro-tip: Livekit Helm chart supports AWS, GCP and Digital Ocean as cloud providers. If you are using a different cloud provider,
> try the "Digital Ocean" configuration, as it is the most generic one.

The WorkAdventure Helm chart will automatically generate an API key for Livekit and configure the WorkAdventure server to use it.

Livekit needs a dedicated domain name. Please be sure to get one and point the IP of the domain to the load balancer IP of 
your ingress controller.

You still need to configure some values in the `livekitServer` section of the `values.yaml` file to have Livekit working correctly.

Here are the most important values to configure:

**values.yaml**
  
```yaml
back:
  env:
    LIVEKIT_HOST: "https://livekit.your-domain.com"
    LIVEKIT_WS_URL: "wss://livekit.your-domain.com"

livekitServer:
  enabled: true

  loadBalancer:
    # Use Digital Ocean unless you are using AWS or GCP (more examples at https://github.com/livekit/livekit-helm/tree/master/examples)
    type: do
    # TLS certificate generated automatically with certmanager / letsencrypt
    # secretName is still required. certmanager will place the provisioned
    # certificate in that secret
    clusterIssuer: letsencrypt-prod
    tls:
      - hosts:
          - livekit.your-domain.com
        secretName: livekit-certificate-secret
```
