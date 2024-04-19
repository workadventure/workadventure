---
sidebar_position: 13
---

## Getting started with self hosted Map

Pour avoir votre map self hosted you need to follow these steps :

Start by [creating a GitHub account](https://github.com/join) if you don't already have one.

Go to the [Github map starter kit repository page](https://github.com/workadventure/map-starter-kit) and click the **"Use this template"** button.

![The "Use this template" button](../images/use_this_template.png)

You will be prompted to enter a repository name for your map.

![The "create a new repository" page](../images/create_repo.png)

### Installation

This package is designed to help you upload maps from Tiled to the map storage of WorkAdventure or your own server.

To install this package, use the following command:

> npm install @workadventure/upload-maps

### Usage

:::info
If you want ot use this package, you will need to install all dependencies related to this package.

> npm install prompt-sync
> npm install axios
> npm install archiver
> npm install dotenv

:::

To use this package run the command in your terminal :

> node_modules/.bin/upload-wa-map

It will ask you some questions:

1. Your API Key.
   You can find it on [Your admin acount](https://admin.workadventu.re), you need to log-in and you'll see on the left panel that you can go to Developers tab --> API keys /Zapier. There you can create a new token. (Don't forget to save it !)

2. The URL of your map storage.
   The map storage is in the same section as the API Key above. There are 3 links be careful to take the "Map-storage API endpoint", it is the url for uploading map storage

   ![Get your API Key](../images/navigate_admin.png)
   ![Get your API Key](../images/get_info_key.png)

3. Directoy
   You can also add a directory name if you want. It will be the folder where all your uploaded files will be stored in.
   If you leave this blank, there will be no directory.

4. Upload Mode
   The upload mode is the way you want to host your map. If your following this tutorial it mean you want to be self hosted so you need to enter 1 to choose this mode of storage.
   If you have any doubt about your upload mode you can check here for the others options.
   [Build your Map with Tiled](index.md)

After answering these question, the script will start to upload your file. You need to see something like this : Upload done successfully

To complete the upload, you need to set your secrets variables in your github repository. You need to set the URL of your map storage and your API Key to push your new release ! You can find here a tutoriel on how to set up your secrets variables in github.

[How to set your secrets in github](https://scribehow.com/shared/Upload_Map__Set_up_secrets_for_in_your_repository__FKsqAsrVQ_SzDavSudb19Q)

> When your done you can just commit and push your changes and it's done !

## Need some help?

WorkAdventure is a constantly evolving project and there is plenty of room for improvement regarding map editing.
If you are facing any troubles, do not hesitate to seek help in [our Discord server](https://discord.gg/G6Xh9ZM9aR) or open an "issue" in the [GitHub WorkAdventure account](https://github.com/thecodingmachine/workadventure/issues).
