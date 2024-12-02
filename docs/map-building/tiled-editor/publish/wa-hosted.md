---
sidebar_position: 10
title: Upload your Map to WorkAdventure
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Upload your Map to WorkAdventure

:::info
As of May 2024, this is the recommended way of hosting your maps
:::

<iframe width="100%" height="480" src="https://youtube.com/embed/WNcbEHm2Hlg" title="Upload your map - With the script" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>

WorkAdventure servers can host your map files.

In the following sections, we will explain how to upload your map to the WorkAdventure 'map storage' server from the command line or from a CI/CD pipeline.

## Using the command line

The map starter kit is designed to help you upload maps from your computer to the map storage of WorkAdventure.

In order to use this package run the command in your terminal:

```bash
npm run upload
```

Know that you can also use this command with flags:

- -u for the URL of the Map storage
- -k for the API KEY
- -d for the Upload directory

Here is how you can use flags :

```bash
npm run upload -- -u your-map-storage-url -k your-api-key  -d your-directory
```

If you do so, keep in mind that these secret variables will not be saved in `.env` and `.env.secret` files.

So on the first run (without flags), the command will ask you the URL of your world's map storage, your API Key and a directory to put your files.

Where you get this depends on the kind of WorkAdventure server you are using.
If you are using the SaaS version of WorkAdventure, then you will find the information on the Admin panel.
If you are self-hosting WorkAdventure, then you will have to configure the map storage yourself.

<Tabs>
<TabItem label="SaaS version" value="saas" default>

1. **The URL of your map storage:**
   You can find it in [your admin account](https://admin.workadventu.re).
   Log in.
   In the left panel, click on "Developers" tab then "API keys / Zapier".
   There are 3 links, be careful to take the `Map-storage API endpoint`, it is the url for uploading files to the map storage service of WorkAdventure.

   ![Get your API Key](../../images/navigate_admin.png)
   ![Get your API Key](../../images/get_info_key.png)

   :::info Select the World
   Be careful to select the proper world just above before copying your map storage url and create your key
   :::
   ![Choose your world](../../images/select-your-world.png)

2. **Your Map Storage API Key:**
   You can find it in the same section.
   There you can create a new token and use it as your API Key.

3. **Directory:**
   You also have to add a **directory name**, it will be the folder where all your uploaded files will be stored in.

   By default, we will use your GitHub pseudo and GitHub repository: `githubname-githubrepository`. This is if you're using GitHub and the `map starter kit repository`.

   If you're not using GitHub, the script will ask you a directory name and if you leave it empty, by default the directory will be named "maps".

   The directory name appear in the URL of your map.

   Be careful, if you upload two separate maps within the same directory, the second will erase the first one. So we recommend you to set a custom directory name for each project as long as they are in the same Admin world.

</TabItem>
  
<TabItem label="Self-hosted" value="self-hosted">

  **Your API Key:**

  The system administrator that installed the WorkAdventure server should have provided you with an API key.

  - For **docker-compose deployements**, it is the value of the `MAP_STORAGE_AUTHENTICATION_TOKEN` environment variable.
    Also, be sure to have the `MAP_STORAGE_ENABLE_BEARER_AUTHENTICATION` set to `"true"` in your `.env` file.
  - For **Helm deployments** , it is the value of the `mapstorage.env.AUTHENTICATION_TOKEN` value in your `values.yaml` file.
    Also, be sure to have the `mapstorage.env.ENABLE_BEARER_AUTHENTICATION` set to `"true"` in your `values.yaml` file.

  **The URL of your map storage:**

  The map storage URL depends on your install.

  - For **docker-compose deployments**, it should be `https://[workadventure-server]/map-storage/` if you are using the default configuration.
  - For **Helm deployments**, it should also be `https://[workadventure-server]/map-storage/` if you are using `singleDomain: true` in your `values.yaml` file,
    or `https://mapstorage.[workadventure-server]` if `singleDomain: false` in your `values.yaml` file.

  **Directory:**
  You can also add a `directory name` if you want. It will be the folder where all your uploaded files will be stored in.
  If you leave this blank, there will be no directory.

</TabItem>
</Tabs>

:::caution Uploading maps overwrites existing files!
When you upload files to the WorkAdventure server, all the files previously uploaded in the same directory will be removed
and replaced by your new files. If you keep the "directory" empty, this means that
all the files in your world will be removed and replaced by your new files.
:::

After answering these questions, the script will start to upload your files. To make sure it worked, uou need to see something like this at the end: `Upload done successfully!`.

:::info
Your settings have been saved in a `.env` file (and the API Key in the `.env.secret` file). If you need to change them, you can edit these files.
:::

Now, for every change you want to make public, you just have run the command again!

## How it works

When you run the `npm run upload` command, the following things happen:

1. First, your map files are "built". During the build phase:
  1.1. The tilesets of your map are optimized and chunked. Any tile that is not used is removed. This is done to reduce the total size of the map and results in faster loading time.
  1.2. The scripts of your map are compiled and bundled. This happens if you developed some specific features on your map using the Scripting API. The compilation phase translates files from Typescript to Javascript. The bundling phase takes all the Javascript files and merges them into a single file.
  1.3. The result of the build is written in the dist directory.
  1.4. The content of the public directory is copied to the dist directory.
2. Then, a ZIP file of the dist directory is created and sent to the WorkAdventure "map-storage" server. This server is in charge of hosting the map files. When it receives the ZIP file, it unzips it and stores the files in the directory you configured as 'Upload directory'. For each `.tmj` file the server finds, it will check if there exists a matching `.wam` file. If not, it will create one. WAM files are used to store any part of the map edited by the Map editor of WorkAdventure (like the list of objects or areas, the microphone settings, etc.)

:::danger Backup your original files!
If you're uploading on WorkAdventure server, it only stores the "build" you send to it. It does not store the original files you used to create the map. If you want to update your map, you need to update the original files on your computer and run the `npm run upload` command again. So do not think you can get back the original files from the WorkAdventure server. It is your responsibility to store the original map files in a safe place in case you want to modify those (like GitHub).
:::

:::info Wrapping things up
In this chapter, we saw how to upload your map from your computer to the WorkAdventure server using a command line.
This works well and for small projects, this is probably the best way to go.
In the next chapter, a more robust way to store and work on your map files: GitHub's CI/CD.
:::

## Using GitHub and a CI/CD pipeline

<iframe width="100%" height="480" src="https://youtube.com/embed/FvS63eHeKi0" title="Upload your map using GitHub CI/CD" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>

A great place to store your original files is in a Git repository (like GitHub or Gitlab). If you are a developer, you probably already know about these. A Git repository offers the following advantages:

- you store your files **in a safe place**
- you can **work with other people** on the same map
- you can **track the changes** you made to the map
- you can **revert to a previous version** of the map if you made a mistake
- you can use a **CI/CD pipeline** (like "GitHub Actions") to automatically upload your map to the WorkAdventure server when you push changes to the repository.

The map starter kit comes with a GitHub Actions workflow that is designed to upload your map to the WorkAdventure server when you push your changes to the `master` branch of your repository. It also means you can now have a private repository instead of a public one, because we won't use GitHub Pages anymore (GitHub free hosting).

:::caution Git is complex
Git is a powerful tool, but it can be complex to use and is very targeted at developers. If you are not familiar with Git, you should probably start with the "command line" solution explained in the previous chapter.
:::

## Configuring you project for CI/CD

If you used the command line solution explained in the previous chapter, you will notice that the upload command generates
2 files:

- `.env` that contains the URL of the Map storage
- `.env.secret` that contains the API Key

The `.env` file can be commited to your Git repository. However, the `.env.secret` file should **never** be commited.
Indeed, it contains your map storage API Key, and if someone gets access to it, they could upload files to your map storage!

Instead, you should use the "secrets" feature of GitHub to store your private information. This way, the API key is not stored in the repository.

<details>
  <summary>Learn how to configure a secret in GitHub</summary>
<div>

- Go to your GitHub repository
- Click on the "Settings" tab
  ![The settings tab](./images/github-settings.png)
- Click on the "Secrets and variables" link in the left panel
  ![The secrets link](./images/github-secrets-and-variables.png)
- Click on the "Actions" link
  ![The actions button](./images/github-actions-menu.png)
- Finally, click on the "New repository secret" button
  ![The new repository secret button](./images/github-new-repo-secret.png)

</div>
</details>

You should create a secret named `MAP_STORAGE_API_KEY` and paste your map storage API Key there. See the [previous section](#using-the-command-line) to know how to get your API key.

*Note that you can optionally create a `MAP_STORAGE_URL` and a `UPLOAD_DIRECTORY` as well and completely bypass the `.env` file, if you need to.*
*If you have both, the variables from GitHub secrets will be used in priority when uploading via the CI.*

Now, for every change you want to make public, you just have to commit and push to your repository! Just wait a few minutes, and your map will be propagated automatically on your server.

## Troubleshooting

### Typescript error

If you are doing some development with the Scripting API, you may encounter Typescript errors when you run the `npm run upload` command.
Indeed, the `npm run upload` command first performs a build of your Typescript files. If there is a Typescript error, the build will fail.

The error message will be displayed in your terminal. You should fix the error and run the `npm run upload` command again.

:::note
When testing your script locally, you are using Vite. Vite is only transpiling Typescript files. It turns them into Javascript without doing any
actual type checking. This is why you can have **a script working locally but failing to build**.
:::

### Checking the dist directory

Remember the map(s) uploaded to the WorkAdventure server is the content of the `dist` directory. If things are working locally, but act strangely on the server (sound files not playing, HTTP 404 errors, etc...), you should check the content of the `dist` directory.

You can trigger a build of your map by running the following command:

```bash
npm run build
```

Do not forget that if you want to put random files in the `dist` directory, you should put them in the `public` directory.
The content of the `public` directory is copied 'as is' to the `dist` directory during the build phase.

### My map is not updated (using GitHub)

When you push changes to your repository, the GitHub Actions workflow is triggered. It will build your map and upload it to the WorkAdventure server.
If you see that your map is not updated, you should check the "Actions" tab of your repository to see if the workflow was triggered and if it failed.

Common reasons for the workflow to fail:

- the API key is not set in the secrets of your repository
- the URL of the map storage is not set in the secrets of your repository or in the .env file
- the build of the map failed (Typescript error, etc...)
- the workflow did not trigger (you are not pushing to the `master` branch, etc...)

## Need some help?

WorkAdventure is a constantly evolving project and there is plenty of room for improvement regarding map editing.
If you are facing any troubles, do not hesitate to seek help in [our Discord server](https://discord.gg/G6Xh9ZM9aR) or open an issue in the [GitHub WorkAdventure project](https://github.com/workadventure/workadventure/issues).
If the issue is linked to the upload feature itself, feel free to open an issue in the [Map upload package](https://github.com/workadventure/upload-maps/issues) directly.
