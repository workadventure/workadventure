{.section-title.accent.text-primary}
# API Navigation functions reference

### Opening a web page in a new tab

```
WA.nav.openTab(url: string): void
```

Opens the webpage at "url" in your browser, in a new tab.

Example:

```javascript
WA.nav.openTab('https://www.wikipedia.org/');
```

### Opening a web page in the current tab

```
WA.nav.goToPage(url: string): void
```

Opens the webpage at "url" in your browser in place of WorkAdventure. WorkAdventure will be completely unloaded.

Example:

```javascript
WA.nav.goToPage('https://www.wikipedia.org/');
```

### Going to a different map from the script

```

WA.nav.goToRoom(url: string): void
```

Load the map at url without unloading workadventure

relative urls: "../subFolder/map.json[#start-layer-name]"
global urls: "/_/global/domain/path/map.json[#start-layer-name]"

Example:

```javascript
WA.nav.goToRoom("/@/tcm/workadventure/floor0")  // workadventure urls
WA.nav.goToRoom('../otherMap/map.json');
WA.nav.goToRoom("/_/global/<path to global map>.json#start-layer-2")
```

### Opening/closing web page in Co-Websites

```
WA.nav.openCoWebSite(url: string, allowApi: boolean = false, allowPolicy: string = "", position: number = 0): Promise<CoWebsite>
```

Opens the webpage at "url" in an iFrame (on the right side of the screen) or close that iFrame. `allowApi` allows the webpage to use the "IFrame API" and execute script (it is equivalent to putting the `openWebsiteAllowApi` property in the map). `allowPolicy` grants additional access rights to the iFrame. The `allowPolicy` parameter is turned into an [`allow` feature policy in the iFrame](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-allow), position in whitch slot the web page will be open.
You can have only 5 co-wbesites open simultaneously.

Example:

```javascript
const coWebsite = await WA.nav.openCoWebSite('https://www.wikipedia.org/');
const coWebsiteWorkAdventure = await WA.nav.openCoWebSite('https://workadventu.re/', true, "", 1);
// ...
coWebsite.close();
```

### Opening/closing web page in Co-Websites

```
WA.nav.getCoWebSites(): Promise<CoWebsite[]>
```

Get all opened co-websites with their ids and positions.

Example:

```javascript
const coWebsites = await WA.nav.getCowebSites();
```
