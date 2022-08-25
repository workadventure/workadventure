![](https://github.com/thecodingmachine/workadventure/workflows/Continuous%20Integration/badge.svg) [![Discord](https://img.shields.io/discord/821338762134290432?label=Discord)](https://discord.gg/G6Xh9ZM9aR)

![WorkAdventure logo](README-LOGO.svg)
![WorkAdventure office image](README-MAP.png)

Live demo [here](https://play.staging.workadventu.re/@/tcm/workadventure/wa-village).

# WorkAdventure

WorkAdventure is a web-based collaborative workspace presented in the form of a
16-bit video game.

In WorkAdventure you can move around your office and talk to your colleagues (using a video-chat system, triggered when you approach someone).

See more features for your virtual office: https://workadventu.re/virtual-office

## Community resources

Check out resources developed by the WorkAdventure community at [awesome-workadventure](https://github.com/workadventure/awesome-workadventure)

## Setting up a production environment

The way you set up your production environment will highly depend on your servers.
We provide a production ready `docker-compose` file that you can use as a good starting point in the [contrib/docker](https://github.com/thecodingmachine/workadventure/tree/master/contrib/docker) directory.

## Setting up a development environment

> **Note**  
> These installation instructions are for local development only. They will not work on
> remote servers as local environments do not have HTTPS certificates.

Install Docker.

Run:

```
cp .env.template .env
docker-compose up
```

The environment will start.

You should now be able to browse to http://play.workadventure.localhost/ and see the application.
You can view the Traefik dashboard at http://localhost:8080/

Note: on some OSes, you will need to add this line to your `/etc/hosts` file:

**/etc/hosts**
```
127.0.0.1 workadventure.localhost
```

You can also start WorkAdventure + a test OpenID connect server using:

```console
$ docker-compose -f docker-compose.yaml -f docker-compose-oidc.yaml up
```

(Test user is "User1" and his password is "pwd")


### Troubleshooting

#### MacOS users

Unlike with Windows and Linux, MacOS developers need to configure an amount of RAM dedicated
to Docker. If some containers are "Killed", you will need to increase the amount of RAM given
to Docker. At least 6GB of RAM is needed.

If the performance is poor, you can also try to [run WorkAdventure inside Vagrant](docs/dev/vagrant.md).

#### Windows users

If you find errors in the docker logs that contain the string "\r", you have an issue with your Git configuration.
On Windows, Git can be configured to change the carriage return from "\n" to "\r\n" on the fly. Since the code
is running in Linux containers, you absolutely want to be sure the Git won't do that. For this, you need to
disable the `core.autocrlf` settings.

If you run into this issue, please run the command:

```console
git config --global core.autocrlf false
```

Then, delete the WorkAdventure directory and check it out again.

#### CORS error / HTTP 502 error

If you see a CORS error or an HTTP 502 error when trying to load WorkAdventure, check the logs from the `pusher`
and from the `back` container. If you see an error, you can simply try to restart them.
Sometimes, a rare race condition prevents those containers from starting correctly in dev. 

```console
docker-compose restart pusher
docker-compose restart back
```
