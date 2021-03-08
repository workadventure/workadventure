console.log('SCRIPT LAUNCHED');
WA.sendChatMessage('Hi, my name is Poly and I repeat what you say!', 'Poly Parrot');


WA.onChatMessage((message => {
    console.log('CHAT MESSAGE RECEIVED BY SCRIPT');
    WA.sendChatMessage('Poly Parrot says: "'+message+'"', 'Poly Parrot');
}));

WA.onEnterZone('myTrigger', () => {
    WA.sendChatMessage("Don't step on my carpet!", 'Poly Parrot');
})

WA.onLeaveZone('myTrigger', () => {
    WA.sendChatMessage("Thanks!", 'Poly Parrot');
})

WA.onEnterZone('notExist', () => {
    WA.sendChatMessage("YOU SHOULD NEVER SEE THIS", 'Poly Parrot');
})
