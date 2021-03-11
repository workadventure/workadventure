console.log('SCRIPT LAUNCHED');
//WA.sendChatMessage('Hi, my name is Poly and I repeat what you say!', 'Poly Parrot');

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
    WA.openPopup('tutoBobble', 'Hey ! This is how to open start a discussion with someone ! You can be 4 max in a booble   ', [
        {
            label: "Next",
            className: "normal",
            callback: (popup) => {
                popup.close();

                WA.openPopup('tutoChat', 'You can also use the chat to communicate ! ',[
                    {
                        label : "Open Chat",
                        className : "normal",
                        callback: (popup1)=> {
                            WA.sendChatMessage("Hey you can talk here too ! ", 'WA Guide');
                            popup1.close();
                        }
                    }

                ])


            }
        }
    ]);
});

/*WA.onLeaveZone('popupZone', () => {
    WA.sendChatMessage("Thanks!", 'Poly Parrot');
})*/
