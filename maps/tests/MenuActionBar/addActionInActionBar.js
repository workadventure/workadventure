WA.ui.actionBar.addButton({
    id: 'register-btn',
    type: 'action',
    toolTip: 'Test register button',
    imageSrc: 'http://develop.test.workadventu.re/images/feedback/star.svg',
    callback: (event) => {
        console.log('Button registered triggered', event);
        WA.ui.actionBar.removeButton('register-btn');
    }
});
