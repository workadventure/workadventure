import { ChatEvent } from '../Events/ChatEvent'
import { isUserInputChatEvent, UserInputChatEvent } from '../Events/UserInputChatEvent'
import { registerWorkadventureCommand, registerWorkadvntureCallback, sendToWorkadventure } from "./iframe-registration"

let chatMessageCallback: (event: string) => void | undefined

class WorkadvntureChatCommands {

    sendChatMessage(message: string, author: string) {
        sendToWorkadventure({
            type: 'chat',
            data: {
                'message': message,
                'author': author
            } as ChatEvent
        })
    }

    /**
     * Listen to messages sent by the local user, in the chat.
     */
    onChatMessage(callback: (message: string) => void) {
        chatMessageCallback = callback
    }
}

export const commands = registerWorkadventureCommand(new WorkadvntureChatCommands())
export const callbacks = registerWorkadvntureCallback([{
    callback: (event: UserInputChatEvent) => {
        chatMessageCallback?.(event.message)
    },
    type: "userInputChat",
    typeChecker: isUserInputChatEvent
}])

