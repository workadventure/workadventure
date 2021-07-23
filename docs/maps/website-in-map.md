{.section-title.accent.text-primary}
# Putting a website inside a map

You can inject a website directly into your map, at a given position.

To do this in Tiled:

- Select an object layer
- Create a rectangular object, at the position where you want your website to appear
- Add a `url` property to your object pointing to the URL you want to open

<div>
    <figure class="figure">
        <img src="https://workadventu.re/img/docs/website_url_property.png" class="figure-img img-fluid rounded" alt="" style="width: 70%" />
        <figcaption class="figure-caption">A "website" object</figcaption>
    </figure>
</div>

The `url` can be absolute, or relative to your map.

{.alert.alert-info}
Internally, WorkAdventure will create an "iFrame" to load the website.
Some websites forbid being opened by iframes using the [`X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
HTTP header.
