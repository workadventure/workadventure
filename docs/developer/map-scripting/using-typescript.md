---
sidebar_position: 50
title: Using Typescript
---

# Using Typescript with the scripting API

:::info
The easiest way to get started with writing scripts in Typescript is to use the
[GitHub map starter kit repository](https://github.com/workadventure/map-starter-kit). It comes with
Typescript enabled. If you are **not** using the "map starter kit", this page explains how to add Typescript to your
own scripts.
:::

## The short story

In this page, we will assume you already know Typescript and know how to set it up with Webpack.

To work with the scripting API in Typescript, you will need the typings of the `WA` object. These typings can be downloaded from the `@workadventure/iframe-api-typings` package.

```console
$ npm install --save-dev @workadventure/iframe-api-typings
```

Furthermore, you need to make the global `WA` object available. To do this, edit the entry point of your project (usually, it is a file called `index.ts` in the root directory).

Add this line at the top of the file:

**index.ts**
```typescript
/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />
```

From there, you should be able to use Typescript in your project.

## The long story

Below is a step by step guide explaining how to set up Typescript + Vite along your WorkAdventure map.

In your map directory, start by adding a `package.json` file. This file will contain dependencies on Vite, Typescript and the Workadventure typings:

**package.json**
```json
{
  "scripts": {
    "dev": "vite",
    "start": "vite",
    "build": "tsc && vite build",
    "prod": "vite preview"
  },
  "devDependencies": {
    "@types/node": "^18.15.11",
    "@workadventure/iframe-api-typings": "^1.15.10",
    "typescript": "^4.9.5",
    "vite": "^4.3.9",
    "wa-map-optimizer-vite": "^1.1.15"
  },
}
```

You can now install the dependencies:

```console
$ npm install
```

We now need to add a Vite configuration file (for development mode). This Vite file will:

*   Start a local webserver that will be in charge of serving the map
*   Compile Typescript into Javascript and serve it automatically
*   Optimize your built map

**vite.config.js**
```js
import { defineConfig } from "vite";
import { getMaps, getMapsOptimizers, getMapsScripts } from "wa-map-optimizer-vite";

const maps = getMaps();

export default defineConfig({
    base: "./",
    build: {
        rollupOptions: {
            input: {
                index: "./index.html",
                ...getMapsScripts(maps),
            },
        },
    },
    plugins: [...getMapsOptimizers(maps)],
    server: {
        host: "localhost",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization",
            "Cache-Control": "no-cache, no-store, must-revalidate",
        },
        open: "/",
    },
});
```

We need to configure Typescript, using a `tsconfig.json` file.

**tsconfig.json**
```json
{
  "compilerOptions": {
    "outDir": "./dist/",
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": [
      "ESNext",
      "DOM"
    ],
    "allowJs": true,
    "moduleResolution": "Node",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noFallthroughCasesInSwitch": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "skipLibCheck": true
  },
  "include": [
    "src"
  ]
}
```

Create your entry point (the index.html).
```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>WorkAdventure Starter</title>
</head>

<body></body>

</html>
```


Create your entry script (the Typescript file at the root of your project).

**src/index.ts**
```typescript
/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

console.log('Hello world!');
```

The first comment line is important in order to get `WA` typings.

Now, you can start Vite in dev mode!

```console
$ npm run dev
```

This will automatically compile Typescript, and serve it (along the map) on your local web server (so at `http://localhost:8080/script.js`). Please note that the `script.js` file is never written to the disk. So do not worry if you don't see it appearing, you need to "build" it to actually write it to the disk.

Final step, you must reference the script inside your map, by adding a `script` property at the root of your map:

![The script property](images/script_property.png)

### Building the final script

We now have a correct development setup. But we still need to be able to build the production script from Typescript files.

You can simply run:

```console
$ npm run build
```

and the `script.js` file will be generated in the `dist/` folder. Beware, you will need to move it at the root of map for it to be read by the map.
