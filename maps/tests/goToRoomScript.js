/// <reference path="../../front/src/iframe_api.ts" />
var urlPricing = "https://workadventu.re/pricing";
var urlGettingStarted = "https://workadventu.re/getting-started";
var urlRelativeMap = "script_api.json";
var isCoWebSiteOpened = false;

WA.room.onEnterLayer("triggerArea").subscribe(() => {
    WA.nav.goToRoom("#teleportTo")
});

WA.room.onEnterLayer("triggerLayer").subscribe(() => {
    WA.nav.goToRoom("#teleportToLayer")
});
