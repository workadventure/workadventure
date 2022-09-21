console.info('In ten seconds, the tuto modal will be launched')

function launchTuto(){
    console.info('Lunch tuto');
    WA.ui.modal.openModal({src: 'http://extra.workadventure.localhost/tutorialv1.html'});
}

setTimeout(() => {
    launchTuto();
}, 2000)
