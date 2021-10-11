import { emoteStore } from "../Stores/EmoteStore";
import { chatVisibilityStore } from "../Stores/ChatStore";

const emoteCommand = "emote";

class CommandManager {
    doCommand(command: string, args: string[]) {
        switch (command) {
            case emoteCommand:
                this.doEmoteCommand(args);
                break;
            default:
                throw "Incorrect command " + command;
        }
    }

    doEmoteCommand(args: string[]) {
        const emoteCode = args.shift();
        if (!emoteCode) {
            throw "Command emote: incorrect arguments";
        }

        chatVisibilityStore.set(false);
        emoteStore.set(String.fromCodePoint(parseInt(emoteCode, 16)));
    }
}

export const commandManager = new CommandManager();
