console.info('In ten seconds, the tuto modal will be launched')

function launchTuto(){
    console.info('Lunch tuto');
    WA.ui.modal.openModal({
        src: 'https://workadventu.re'
    });

    setTimeout(() => {
        WA.ui.modal.closeModal();
    }, 2000);
}

setTimeout(() => {
    launchTuto();
}, 2000)
