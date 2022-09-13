console.log('In ten seconds, the tuto modal will be launched')

function launchTuto(){
    WA.modal.openModal({src: 'https://workadventu.re'});

    setTimeout(() => {
        WA.modal.closeModal();
    }, 2000);
}

setTimeout(() => {
    launchTuto();
}, 1000)
