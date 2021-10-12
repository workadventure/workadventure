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

function wookaSendMessage(message) {
    WA.chat.sendChatMessage(message, 'Wooka');
}

function unknownCommand() {
    wookaSendMessage('Unknown command');
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
        wookaSendMessage('Too few arguments');
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
        wookaSendMessage('Too few arguments');
        return;
    }

    try {
        const url = new URL(args[0]);
      } catch (exception) {
        wookaSendMessage('Parameter is not a valid URL !');
        return;
      }

    await WA.nav.openCoWebsite(args[0]).then(() => {
        wookaSendMessage('Co-website has been opened !');
    }).catch((error) => {
        wookaSendMessage(`Something wrong happen during co-website opening: ${error.message}`);
    });
}

async function closeCoWebsite(args) {
    if (args.length < 1)  {
        wookaSendMessage('Too few arguments');
        return;
    }

    // All
    if (args[0] === "all" || args[0] === "*") {
        WA.nav.closeCoWebsites().then(() => {
            wookaSendMessage('All co-websites has been closed !');
        }).catch((error) => {
            wookaSendMessage(`Something wrong happen during co-websites closing: ${error.message}`);
        });
        return;
    }

    const coWebsites = await WA.nav.getCoWebsites();
    const position = parseInt(args[0]);

    // By ID or Position
    const coWebsite =
        isNaN(position) ?
        coWebsites.find((coWebsite) => coWebsite.id === args[0]) :
        coWebsites.find((coWebsite) => coWebsite.position === position);

    if (!coWebsite) {
        wookaSendMessage('Unknown co-website');
        return;
    }

    await WA.nav.closeCoWebsite(coWebsite.id).then(() => {
        wookaSendMessage('This co-websites has been closed !');
    }).catch((error) => {
        wookaSendMessage(`Something wrong happen during co-website closing: ${error.message}`);
    });
}
