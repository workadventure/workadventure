### MacOS developers, your environment with Vagrant

If you're running MacOS, you can boost Docker performance with Vagrant.
If you want more information, [read this Medium article](https://medium.com/better-programming/vagrant-to-increase-docker-performance-with-macos-25b354b0c65c).

#### Prerequisites

- [VirtualBox](https://www.virtualbox.org/wiki/Downloads)	
- [Vagrant](https://www.vagrantup.com/downloads.html)

#### First steps

Create a config file `Vagrantfile` from `Vagrantfile.template`

```bash
cp Vagrantfile.template Vagrantfile
```

In `Vagrantfile`, update `VM_HOST_PATH` with the local project path of your machine.

```
#VM_HOST_PATH# => your local machine path to the project

```

(run `pwd` and copy the path in this variable)

To start your VM Vagrant, run:

```bash
Vagrant up
```

To connect to your VM, run:

```bash
Vagrant ssh
```

To start project environment, run:

```bash
docker-compose up
```

Your environment runs inside your Vagrant virtual machine. When you want stop your VM, you can run:

````bash
Vagrant halt
````

If you want to destroy the VM, you can run:

````bash
Vagrant destroy
````

#### Available commands

* `Vagrant up`: start your VM Vagrant.
* `Vagrant reload`: reload your VM Vagrant when you change Vagrantfile.
* `Vagrant ssh`: connect on your VM Vagrant.
* `Vagrant halt`: stop your VM Vagrant.
* `Vagrant destroy`: delete your VM Vagrant.
