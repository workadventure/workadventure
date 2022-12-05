console.info('In ten seconds, the tuto modal will be launched')

function launchTuto(){
    console.info('Lunch tuto');
    WA.ui.actionBar.addButtonActionBar('register-btn', 'Regsiter', (event) => {
        console.log('Button registered triggered', event);
        WA.ui.actionBar.removeButtonActionBar('register-btn');
    });
}

setTimeout(() => {
    launchTuto();
}, 2000)
