console.log('SCRIPT LAUNCHED');
//WA.sendChatMessage('Hi, my name is Poly and I repeat what you say!', 'Poly Parrot');
var isFirstTimeTuto = false;
var textFirstPopup = 'Hey ! This is how to open start a discussion with someone ! You can be 4 max in a booble';
var textSecondPopup = 'You can also use the chat to communicate ! ';
var targetObjectTutoBubble ='tutoBobble';
var targetObjectTutoChat ='tutoChat';
var popUpExplanation = undefined;
function launchTuto (){
        WA.openPopup(targetObjectTutoBubble, textFirstPopup, [
            {
                label: "Next",
                className: "normal",
                callback: (popup) => {
                    popup.close();

                    WA.openPopup(targetObjectTutoChat, textSecondPopup, [
                        {
                            label: "Open Chat",
                            className: "normal",
                            callback: (popup1) => {
                                WA.sendChatMessage("Hey you can talk here too ! ", 'WA Guide');
                                popup1.close();
                                WA.enablePlayerControl();
                            }
                        }

                    ])
                }
            }
        ]);
        WA.disablePlayerControl();

}
WA.onChatMessage((message => {
    console.log('CHAT MESSAGE RECEIVED BY SCRIPT');
    WA.sendChatMessage('Poly Parrot says: "'+message+'"', 'Poly Parrot');
}));

WA.onEnterZone('myTrigger', () => {
    WA.sendChatMessage("Don't step on my carpet!", 'Poly Parrot');
})

WA.onLeaveZone('popupZone', () => {
})

WA.onEnterZone('notExist', () => {
    WA.sendChatMessage("YOU SHOULD NEVER SEE THIS", 'Poly Parrot');
})

WA.onEnterZone('popupZone', () => {
    WA.displayBubble();
    if (!isFirstTimeTuto) {
        isFirstTimeTuto = true;
        launchTuto();
    }
     else popUpExplanation =  WA.openPopup(targetObjectTutoBubble,'Do you want to review the explantion', [
        {
            label: "No",
            className: "normal",
            callback: (popup) => {
                popup.close();
            }
        },
        {
            label: "Yes",
            className: "normal",
            callback: (popup) => {
                popup.close();
                launchTuto();
            }
        }
    ])
});

WA.onLeaveZone('popupZone', () => {
    if (popUpExplanation !== undefined) popUpExplanation.close();
    WA.removeBubble();
})
