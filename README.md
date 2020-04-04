# Work Adventure

## Work in progress

Work Adventure is a web-based collaborative workspace for small to medium teams (2-100 people) presented in the form of a
16-bit video game.

In Work Adventure, you can move around your office and talk to your colleagues (using a video-chat feature that is
triggered when you move next to a colleague).


## Getting started

Install Docker.

Run:

```
docker-compose up
```

The environment will start.

You should now be able to browse to http://workadventure.localhost/ and see the application.

Note: on some OSes, you will need to add this line to your `/etc/hosts` file:

**/etc/hosts**
```
workadventure.localhost 127.0.0.1
```

## MacOs developer, your environment with Vagrant
Increase Docker Performance with Vagrant. If you want more explain you can read: [this medium article](https://medium.com/better-programming/vagrant-to-increase-docker-performance-with-macos-25b354b0c65c).
### Prerequisites
- VirtualBox*	5.x	Latest version	https://www.virtualbox.org/wiki/Downloads
- Vagrant	2.2.7	Latest version	https://www.vagrantup.com/downloads.html
### First steps
Create config file `Vagrantfile` with `Vagrantfile.template`
````bash
cp Vagrantfile.template Vagrantfile
````
In `Vagrantfile` Update `VM_HOST_PATH` with your local file path of your machine. 
````
#VM_HOST_PATH# => your local machine path of the project
````
run `pwd` and copy the path in this variable.
To start your VM Vagrant, run
````bash
Vagrant up
````
To connect on your VM run 
````bash
Vagrant ssh
````
To start project environment docker, run
````bash
docker-compose up
````
You environment run in you VM Vagrant. When you want stop your VM, you can run
````bash
Vagrant halt
````
If you want to destroy, you can run
````bash
Vagrant destroy
````

### Available commands

* `Vagrant up`: start your VM Vagrant.
* `Vagrant reload`: reload your VM Vagrant when you change Vagrantfile.
* `Vagrant ssh`: connect on your VM Vagrant.
* `Vagrant halt`: stop your VM Vagrant.
* `Vagrant destroy`: delete your VM Vagrant.


