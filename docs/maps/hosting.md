{.section-title.accent.text-primary}
# Hosting your map

The [Getting Started](.) page proposes to use a "starter kit" that is relying on GitHub pages for hosting the map. This is a fairly good solution as GitHub pages offers a free and performant hosting.

But using GitHub pages is not necessary. You can host your maps on any webserver.

{.alert.alert-warning}
If you decide to host your maps on your own webserver, you must **configure CORS headers** in your browser to allow access from WorkAdventure.

## Configuring CORS headers

CORS headers ([Cross Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)) are useful when a website want to make some resources accessible to another website. This is exactly what we want to do. We want the map you are designing to be accessible from the WorkAdventure domain (`play.workadventu.re`).

{.alert.alert-warning}
If you are using the "scripting API", only allowing the `play.workadventu.re` will not be enough. You will need to allow `*`
as a domain in order to be able to load scripts. If for some reason, you cannot or do not want to allow `*` as a domain, please
read the [scripting internals](scripting-internals.md) guide for alternatives.

### Enabling CORS for Apache

In order to enable CORS in your Apache configuration, you will need to ensure the `headers` module is enabled.

In your Apache configuration file, simply add the following line inside either the `<Directory>`, `<Location>`, `<Files>` or `<VirtualHost>` sections, or within a `.htaccess` file.

    Header set Access-Control-Allow-Origin "*"

### Enabling CORS on another webserver

Check out [enable-cors.org](https://enable-cors.org/server.html) which has detailed instructions on how to enable CORS on many different webservers.
