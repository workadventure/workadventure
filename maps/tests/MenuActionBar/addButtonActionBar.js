console.info('In ten seconds, the tuto modal will be launched')

function launchTuto(){
    console.info('Lunch tuto');
    WA.ui.actionBar.addButton('register-btn', 'Register', (event) => {
        console.log('Button registered triggered', event);
        WA.ui.actionBar.removeButton('register-btn');
    });
}

setTimeout(() => {
    launchTuto();
}, 2000)
