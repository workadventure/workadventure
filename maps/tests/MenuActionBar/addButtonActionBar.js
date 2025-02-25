WA.ui.actionBar.addButton({
    id: 'register-btn',
    label: 'Register',
    callback: (event) => {
        console.log('Button registered triggered', event);
        WA.ui.actionBar.removeButton('register-btn');
    }
});

WA.ui.actionBar.addButton({
    id: 'inventory-btn',
    label: 'Inventory',
    callback: (event) => {
        console.log('Button registered triggered', event);
        WA.ui.actionBar.removeButton('inventory-btn');
    }
});

WA.ui.actionBar.addButton({
    id: 'register-btn-2',
    type: 'action',
    toolTip: 'Test register button',
    imageSrc: 'http://play.workadventure.localhost/static/images/applications/appOn.png',
    callback: (event) => {
        console.log('Button registered triggered', event);
        WA.ui.actionBar.removeButton('register-btn-2');
    }
});

WA.ui.actionBar.addButton({
    id: 'feedback-btn',
    label: 'Feedback',
    callback: (event) => {
        console.log('Button registered triggered', event);
        WA.ui.actionBar.removeButton('feedback-btn');
    }
});