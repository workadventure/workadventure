/// <reference path="../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

let currentPopup = undefined;
const today = new Date();
const time = today.getHours() + ":" + today.getMinutes();

WA.room.onEnterZone('clock', () => {
    currentPopup =  WA.ui.openPopup("clockPopup","It's " + time,[]);
})

WA.room.onLeaveZone('clock', closePopUp)
/*
const vsCode = await WA.ui.website.open({
    url: "https://vscode.dev",
    position: {
        vertical: "middle",
        horizontal: "middle",
    },
    size: {
        height: '50vh',
        width: "50vw",
    },
});

vsCode.position.vertical = "top";
*/
function closePopUp(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}
