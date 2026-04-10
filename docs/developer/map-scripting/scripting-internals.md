---
sidebar_position: 40
---

# Scripting Internals

Internally, scripts are always loaded inside `iframes`.

You can load a script:

1. Using the [`script` property in your map properties](index.md#adding-a-script-in-the-map)
2. or from an iframe [opened as a co-website](index.md#adding-a-script-in-an-iframe) or [embedded in the map](/map-building/tiled-editor/website-in-map) or [attached to the UI](references/api-ui#content-manage-fixed-iframes)

## Script restrictions

If you load a script using the `script` property in your map properties (solution 1), you need to understand that
WorkAdventure will generate an iframe, and will load the script inside this iframe.

Things you should know:

:::caution
The [iframe is sandboxed](https://blog.dareboost.com/en/2015/07/securing-iframe-sandbox-attribute/)
:::

This means that the iframe is generated with:

```
<iframe src="..." sandbox="allow-scripts allow-top-navigation-by-user-activation" />
```

Such an iframe has restrictions. In particular, it does NOT have an origin.
Because it has no origin, XHR requests cannot be made from those scripts.

If you absolutely need to make a request to an external server from your script, you can:

- use websockets (that are not subject to CORS restrictions)
- or load the script inside an embedded iframe (that you hide somewhere on the map)

## Script, modules and CORS issues

### Scripts and the map starter kit

Our advice is to use the [map starter kit](https://github.com/workadventure/map-starter-kit) as a base for your map development.

:::note
The description below applies starting with wa-map-optimized-vite package v1.2+. This package is imported
in the `package.json` file of your map starter kit.
:::

When you use the map starter kit, the build tools (Vite + the WorkAdventure Vite plugin) are used.
The WorkAdventure Vite plugin will:

1- scan your maps
2- detect the `script` property in your map properties
3- if your script is a Typescript file, the Vite plugin will compile it to Javascript. Whether it's a Javascript or Typescript
   file, Vite will bundle it.
4- In addition, it will create a small HTML page that will be in charge of loading the Javascript bundle.
5- Finally, it builds an optimized version of your TMJ map where it replaces the reference to your Javascript file to a reference
   to the HTML wrapper.

So if your map contains a "script" property set to "src/main.ts", after building the map with the map starter kit:

- you will find in the `dist/` folder a file named like `main-<hash>.js` (where `<hash>` is a hash computed
  from your map content)
- Next to this file, you will find a file named like `main-<hash>.html` that contains a small HTML page
  that will load the `main-<hash>.js` script.
- Finally, in the built TMJ map located in the `dist/` folder, the map will contain a "script" property set to something like
`main-<hash>.html`.

Your Javascript/Typescript code will therefore be executed in an iframe whose domain will the same domain as
the one hosting your map. If you are storing your map in the map-storage (we advise you to do so), the domain
will be the domain of your map-storage server (in the SAAS version, each world has its own domain name).

### If you don't use the map-starter-kit

:::caution
We really advise you to use the latest version of the [map starter kit](https://github.com/workadventure/map-starter-kit) to build your map.
Use of the map starter kit will avoid you many issues. If you really cannot use it (for instance you are generating
maps on the fly), read below.
:::

If you load a JS script using the `script` property in your map properties (without going through the Vite plugin), 
scripts are loaded by default with the`type="module"` attribute. Because those scripts are [loaded as modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#applying_the_module_to_your_html),
they need to abide by the same-origin policy, so they are using CORS.

But when you load a script directly (if the "script" property refers a JS file instead of a HTML file), WorkAdventure will
create aan iframe on the fly but will put a sandbox on it (for security reasons). Because the iframe is 
sandboxed, the script does not have an origin. Therefore, the web server hosting your script
will need to allow **all** origins with:

```
Access-Control-Allow-Origin: *
```
or alternatively:
```
Access-Control-Allow-Origin: null
```

This should not be a security concern if your website is only hosting static files. However, in the event the website
hosting the script is also hosting dynamic content, please be careful before allowing those headers on a site-wide basis.

If you cannot or do not want to allow CORS to all domains, there is an alternative: you can remove the `type="module"` attribute
from the script. The script will not be able to load modules anymore but will not be bound to the same origin policy anymore
so the `Access-Control-Allow-Origin` header is not needed anymore for this script.

To remove the `type="module"` attribute from the script, in your map properties, next to the `script` attribute,
add a `scriptDisableModuleSupport` boolean property and set this property to "checked".

![](images/script-disable-modules-support.png)
