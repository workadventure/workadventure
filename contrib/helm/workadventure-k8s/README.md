# Workadventure on Kubernetes

This Helm chart deploys [Workadventure](https://github.com/workadventure/workadventure) on Kubernetes.

It is an adaption of the [official Docker Compose deployment](https://github.com/workadventure/workadventure/tree/master/contrib/docker).

## Installation

    helm repo add workadventure-k8s https://workadventure.github.io/workadventure-k8s
    helm install workadventure workadventure-k8s/workadventure

## Configuration

Since the original Container images are completely configured via environment variables, this Helm chart have to use the same approach. Theres is a corresponding `xxx-secret-env.yaml` file and a `xxx-env.yaml` file, which contains all environments variables. There are many pre initialized variables in the template files. Additional entries can be easely added in the corresponding sections of the values file.

There are the `commonEnv` and `commonSecretEnv` sections, which are used in all services.

Please use the original [docker-compose file](https://github.com/workadventure/workadventure/blob/master/contrib/docker/docker-compose.prod.yaml) for reference. Look at the [original configuration template](https://github.com/workadventure/workadventure/blob/master/contrib/docker/.env.prod.template) for more informations about the available variables.

## Upload your map

Open your browser and go to https://< your-domain >/map-storage/.

You will be asked to authenticate. The user is 'admin' and the password is the one you set in the value `mapstorage.secretEnv.AUTHENTICATION_PASSWORD`

You can upload a map as a zip file here. But it is highly recommended to use the [workadventure map starter kit](https://docs.workadventu.re/map-building/tiled-editor/) to create and maintain your maps.
