WA.onInit().then(() => {
    WA.chat.onChatMessage((message) => {

        if (!message.startsWith('/')) {
            return;
        }

        const splitedMessage = message.trim().split(' ');
        const command = splitedMessage.shift().substr(1);

        executeCommand(command, splitedMessage);
    });
});

function wokaSendMessage(message) {
    WA.chat.sendChatMessage(message, 'Woka');
}

function unknownCommand() {
    wokaSendMessage('Unknown command');
}

function executeCommand(command, args) {
    switch(command) {
        case 'cowebsite':
            coWebsiteCommand(args);
            break;
        default:
            unknownCommand();
    }
}

function coWebsiteCommand(args) {
    if (args.length < 1) {
        wokaSendMessage('Too few arguments');
        return;
    }

    const subCommand = args.shift();

    switch(subCommand) {
        case 'open':
            openCoWebsite(args);
            break;
        case 'close':
            closeCoWebsite(args);
            break;
        default:
            unknownCommand();
    }
}

async function openCoWebsite(args) {
    if (args.length < 1)  {
        wokaSendMessage('Too few arguments');
        return;
    }

    try {
        const url = new URL(args[0]);
      } catch (exception) {
        wokaSendMessage('Parameter is not a valid URL !');
        return;
      }

    await WA.nav.openCoWebSite(args[0]).then(() => {
        wokaSendMessage('Co-website has been opened !');
    }).catch((error) => {
        wokaSendMessage(`Something wrong happen during co-website opening: ${error.message}`);
    });
}

async function closeCoWebsite(args) {
    if (args.length < 1)  {
        wokaSendMessage('Too few arguments');
        return;
    }

    const coWebsites = await WA.nav.getCoWebSites();

    // All
    if (args[0] === "all" || args[0] === "*") {
        coWebsites.forEach(coWebsite => {
            coWebsite.close();
        });
        wokaSendMessage('All co-websites has been closed !');
        return;
    }

    const position = parseInt(args[0]);

    // By ID or Position
    const coWebsite =
        isNaN(position) ?
        coWebsites.find((coWebsite) => coWebsite.id === args[0]) :
        coWebsites.find((coWebsite) => coWebsite.position === position);

    if (!coWebsite) {
        wokaSendMessage('Unknown co-website');
        return;
    }

    await coWebsite.close().then(() => {
        wokaSendMessage('This co-websites has been closed !');
    }).catch((error) => {
        wokaSendMessage(`Something wrong happen during co-website closing: ${error.message}`);
    });
}
