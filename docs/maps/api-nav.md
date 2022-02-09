{.section-title.accent.text-primary}
# API Navigation functions reference

### Opening a web page in a new tab

```ts
WA.nav.openTab(url: string): void
```

Opens the webpage at "url" in your browser, in a new tab.

Example:

```ts
WA.nav.openTab('https://www.wikipedia.org/');
```

### Opening a web page in the current tab

```ts
WA.nav.goToPage(url: string): void
```

Opens the webpage at "url" in your browser in place of WorkAdventure. WorkAdventure will be completely unloaded.

Example:

```ts
WA.nav.goToPage('https://www.wikipedia.org/');
```

### Going to a different map from the script

```ts
WA.nav.goToRoom(url: string): void
```

Load the map at url without unloading workadventure

relative urls: "../subFolder/map.json[#start-layer-name]"
global urls: "/_/global/domain/path/map.json[#start-layer-name]"

Example:

```ts
WA.nav.goToRoom("/@/tcm/workadventure/floor0")  // workadventure urls
WA.nav.goToRoom('../otherMap/map.json');
WA.nav.goToRoom("/_/global/<path to global map>.json#start-layer-2")
```

### Opening/closing web page in Co-Websites

```ts
WA.nav.openCoWebSite(url: string, allowApi?: boolean = false, allowPolicy?: string = "", percentWidth?: number, position?: number, closable?: boolean, lazy?: boolean): Promise<CoWebsite>
```

Opens the webpage at "url" in an iFrame (on the right side of the screen) or close that iFrame. `allowApi` allows the webpage to use the "IFrame API" and execute script (it is equivalent to putting the `openWebsiteAllowApi` property in the map). `allowPolicy` grants additional access rights to the iFrame. The `allowPolicy` parameter is turned into an [`allow` feature policy in the iFrame](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-allow),widthPercent define the width of the main cowebsite beetween the min size and the max size (70% of the viewport), position in whitch slot the web page will be open, closable allow to close the webpage also you need to close it by the api and lazy
it's to add the cowebsite but don't load it.

Example:

```ts
const coWebsite = await WA.nav.openCoWebSite('https://www.wikipedia.org/');
const coWebsiteWorkAdventure = await WA.nav.openCoWebSite('https://workadventu.re/', true, "", 70, 1, true, true);
// ...
coWebsite.close();
```

### Get all Co-Websites

```ts
WA.nav.getCoWebSites(): Promise<CoWebsite[]>
```

Get all opened co-websites with their ids and positions.

Example:

```ts
const coWebsites = await WA.nav.getCowebSites();
```
