---
sidebar_position: 40
---

# Scripting Internals

Internally, scripts are always loaded inside `iframes`.

You can load a script:

1. Using the [`script` property in your map properties](index.md#adding-a-script-in-the-map)
2. or from an iframe [opened as a co-website](index.md#adding-a-script-in-an-iframe) or [embedded in the map](/map-building/tiled-editor/website-in-map)

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

If you load a script using the `script` property in your map properties (solution 1), scripts are loaded by default with the
`type="module"` attribute. Because those scripts are [loaded as modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#applying_the_module_to_your_html),
they need to abide by the same-origin policy, so they are using CORS.

But because the iframe is sandboxed, the script does not have an origin. Therefore, the web server hosting your script
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
