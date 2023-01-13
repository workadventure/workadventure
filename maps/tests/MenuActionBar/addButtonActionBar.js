WA.ui.actionBar.addButton({
    id: 'register-btn',
    label: 'Register',
    callback: (event) => {
        console.log('Button registered triggered', event);
        WA.ui.actionBar.removeButton('register-btn');
    }
});
