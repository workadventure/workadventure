/// <reference path="../../front/src/iframe_api.ts" />
var zoneName = "popUpGoToPageZone";
var urlPricing = "https://workadventu.re/pricing";
var urlGettingStarted = "https://workadventu.re/getting-started";
var urlRelativeMap = "script_api.json";
var isCoWebSiteOpened = false;

WA.onChatMessage((message => {
    WA.sendChatMessage('Poly Parrot says: "' + message + '"', 'Poly Parrot');
}));

WA.onEnterZone(zoneName, () => {
    WA.openPopup("popUp", "Open Links", [
        {
            label: "Open Tab",
            className: "popUpElement",
            callback: (popup => {
                WA.openTab(urlPricing);
                popup.close();
            })
        },
        {
            label: "Go To Page", className: "popUpElement",
            callback: (popup => {
                WA.goToPage(urlPricing);
                popup.close();
            })

        },
        {
            label: "openCoWebSite", className: "popUpElement",
            callback: (popup => {
                WA.openCoWebSite(urlPricing);
                isCoWebSiteOpened = true;
                popup.close();
            })

        }, {
            label: "load grouped map",
            className: "popUpElement",
            callback: (popup => {
                WA.goToRoom(urlRelativeMap);
                popup.close();
            })

        }]);
})

WA.onLeaveZone(zoneName, () => {
    if(isCoWebSiteOpened) {
        WA.closeCoWebSite();
        isCoWebSiteOpened = false;
    }
})

WA.onLeaveZone('popupZone', () => {

})
