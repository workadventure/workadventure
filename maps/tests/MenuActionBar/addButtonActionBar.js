console.info('In ten seconds, the tuto modal will be launched')

function launchTuto(){
    console.info('Lunch tuto');
    WA.ui.actionBar.addButtonActionBar('register-btn', 'Regsiter');
}

setTimeout(() => {
    launchTuto();
}, 2000)
