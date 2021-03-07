console.log('SCRIPT LAUNCHED');
WA.sendChatMessage('Hi, my name is Poly and I repeat what you say!', 'Poly Parrot');


WA.onChatMessage((message => {
    console.log('CHAT MESSAGE RECEIVED BY SCRIPT');
    WA.sendChatMessage('Poly Parrot says: "'+message+'"', 'Poly Parrot');
}));
