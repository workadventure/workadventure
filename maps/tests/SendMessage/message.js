/// <reference types="@workadventure/iframe-api-typings/iframe_api" />
console.info('In ten seconds, the tuto modal will be launched')

function launchMessageTest(){
    console.info('Lunch message test');
    WA.chat.sendChatMessage('Test message sent', 'Test machine');
}

WA.onInit().then(() => {
    setTimeout(() => {
        launchMessageTest();
    }, 5000);
});
