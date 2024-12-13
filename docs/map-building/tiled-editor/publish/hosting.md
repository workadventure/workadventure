---
sidebar_position: 30
---

# Self-Hosting your Map

:::caution
There are several ways to host your map. The recommended way is to [host your map on the WorkAdventure server](./wa-hosted) directly.
You can also host your map on [GitHub Pages](./github-pages). Self-hosting is the most complex option and is only recommended if you have special privacy needs or if you want maximum freedom.
:::

The ["Host your Map with GitHub Pages" documentation](./github-pages.md) page proposes to use the "starter kit" that is relying on GitHub pages for hosting the map. This is a fairly good solution as GitHub pages offers a free and performant hosting.

But using GitHub pages is not necessary. You can host your maps on any web server.

:::caution
If you decide to host your maps on your own web server, you must **configure CORS headers** in your browser to allow access from WorkAdventure.
:::

## Building your map

This is an optional step. We still highly recommend to "build" your map.

When you start from the "map starter kit", you can build your map by running the following command:

```bash
npm run build
```

This will run a process that will optimize your map for WorkAdventure. It will rewrite all the tilesets, removing
any unused Tiles. If you are using the scripting API, it will also compile and bundle any Typescript file.

The build process will create a `dist` directory that contains the optimized map. It is this `dist` directory that you will need to host on your web server.

## Configuring CORS headers

CORS headers ([Cross Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)) are useful when a website want to make some resources accessible to another website. This is exactly what we want to do. We want the map you are designing to be accessible from the WorkAdventure domain (`play.workadventu.re`).

:::caution
If you are using the "scripting API", only allowing the `play.workadventu.re` will not be enough. You will need to allow `*`
as a domain in order to be able to load scripts. If for some reason, you cannot or do not want to allow `*` as a domain, please
read the [scripting internals](../../../developer/map-scripting/scripting-internals) guide for alternatives.
:::

### Enabling CORS for Apache

In order to enable CORS in your Apache configuration, you will need to ensure the `headers` module is enabled.

In your Apache configuration file, simply add the following line inside either the `<Directory>`, `<Location>`, `<Files>` or `<VirtualHost>` sections, or within a `.htaccess` file.

    Header set Access-Control-Allow-Origin "*"

### Enabling CORS on another webserver

Check out [enable-cors.org](https://enable-cors.org/server.html) which has detailed instructions on how to enable CORS on many different web servers.
