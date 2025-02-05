![](https://github.com/thecodingmachine/workadventure/workflows/Continuous%20Integration/badge.svg) [![Discord](https://img.shields.io/discord/821338762134290432?label=Discord)](https://discord.gg/G6Xh9ZM9aR) ![Awesome](https://awesome.re/badge.svg)

![WorkAdventure office image](README-MAP.png)

# WorkAdventure


WorkAdventure is a platform that allows you to design **fully customizable collaborative virtual worlds** (metaverse). 

With your own avatar, you can **interact spontaneously** with your colleagues, clients, partners (using a **video-chat system**, triggered when you approach someone).
Imagine **all types of immersive experiences** (recruitments, onboarding, trainings, digital workplace, internal/external events) on desktop, mobile or tablet.

_The little plus? The platform is **GDPR** and **open source**!_

**See more features for your [virtual office](https://workadventu.re/solutions/virtual-working-space/?utm_source=github)!**

**Pricing for our SaaS version [virtual office](https://workadventu.re/virtual-office/?utm_source=github)!**


[![Workadventure live demo example](https://workadventu.re/wp-content/uploads/2024/02/Button-Live-Demo.png)](https://play.staging.workadventu.re/@/tcm/workadventure/wa-village/?utm_source=github)
[![Workadventure Website](https://workadventu.re/wp-content/uploads/2024/02/Button-Website.png)](https://workadventu.re/?utm_source=github)


###### Support our team!
[![Discord Logo](https://workadventu.re/wp-content/uploads/2024/02/Icon-Discord.png)](https://discord.com/invite/G6Xh9ZM9aR)
[![X Social Logo](https://workadventu.re/wp-content/uploads/2024/02/Icon-X.png)](https://twitter.com/Workadventure_)
[![LinkedIn Logo](https://workadventu.re/wp-content/uploads/2024/02/Icon-LinkedIn.png)](https://www.linkedin.com/company/workadventu-re/)


![Stats repo](https://github-readme-stats.vercel.app/api?username={username}&theme=transparent)



## Community resources

1. Want to build your own map, check out our **[map building documentation](https://docs.workadventu.re/map-building/)**
2. Check out resources developed by the WorkAdventure community at **[awesome-workadventure](https://github.com/workadventure/awesome-workadventure)**

## Setting up a production environment

We support 2 ways to set up a production environment:

- using Docker Compose
- or using a Helm chart for Kubernetes

Please check the [Setting up a production environment](docs/others/self-hosting/install.md) guide for more information.

> [!NOTE]
> WorkAdventure also provides a [hosted version](https://workadventu.re/?utm_source=github) of the application. Using the hosted version is
> the easiest way to get started and helps us to keep the project alive.

## Setting up a development environment

> [!NOTE]
> These installation instructions are for local development only. They will not work on
> remote servers as local environments do not have HTTPS certificates.

Install Docker and clone this repository.

> [!WARNING]
> If you are using Windows, make sure the End-Of-Line character is not modified by the cloning process by setting
> the `core.autocrlf` setting to false: `git config --global core.autocrlf false`

Run:

```
cp .env.template .env
docker-compose up
```

The environment will start.

You should now be able to browse to http://play.workadventure.localhost/ and see the application.
You can view the Traefik dashboard at http://traefik.workadventure.localhost

Note: on some OSes, you will need to add this line to your `/etc/hosts` file:

**/etc/hosts**
```
127.0.0.1 oidc.workadventure.localhost redis.workadventure.localhost play.workadventure.localhost traefik.workadventure.localhost matrix.workadventure.localhost extra.workadventure.localhost icon.workadventure.localhost map-storage.workadventure.localhost uploader.workadventure.localhost maps.workadventure.localhost api.workadventure.localhost front.workadventure.localhost
```

You can also start WorkAdventure + a test OpenID connect server using:

```console
$ docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml up
```

(Test user is "User1" and his password is "pwd")


### Troubleshooting

See our [troubleshooting guide](docs/others/troubleshooting.md). 
