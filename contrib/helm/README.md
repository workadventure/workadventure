# WorkAdventure on Kubernetes

This Helm chart deploys Workadventure on Kubernetes.

It is an adaption of the [Docker Compose deployment](../docker).

## Installation

    helm repo add workadventure-k8s https://workadventure.github.io/workadventure-k8s
    helm install workadventure workadventure-k8s/workadventure

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

There is a corresponding `xxx-secret-env.yaml` file and a `xxx-env.yaml` file, which contains 
all environments variables. There are many pre initialized variables in the template files
(all variables relative to the URLs). Additional entries can be easily added in the corresponding 
sections of the values file.

There are the `commonEnv` and `commonSecretEnv` sections, which are used in all services.

If you don't provide a `secretKey` (used to encode JWT tokens), the image will generate one for you.

Please use the original [docker-compose file](../docker/docker-compose.prod.yaml) for reference. Look at the [original configuration template](../docker/.env.prod.template) for more informations about the available variables.

## Upload your map

Open your browser and go to https://< your-domain >/map-storage/.

You will be asked to authenticate. The user is 'admin' and the password is the one you set in the value `mapstorage.secretEnv.AUTHENTICATION_PASSWORD`

You can upload a map as a zip file here. But it is highly recommended to use the [workadventure map starter kit](https://docs.workadventu.re/map-building/tiled-editor/) to create and maintain your maps.
