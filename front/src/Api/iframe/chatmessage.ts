import type { ChatEvent } from '../Events/ChatEvent'
import { isUserInputChatEvent, UserInputChatEvent } from '../Events/UserInputChatEvent'
import { } from "./iframe-registration"
import { apiCallback, IframeApiContribution, sendToWorkadventure } from './IframeApiContribution'


class WorkadvntureChatCommands extends IframeApiContribution<WorkadvntureChatCommands> {
    readonly subObjectIdentifier = 'chat'

    readonly addMethodsAtRoot = true

    chatMessageCallback?: (event: string) => void

    callbacks = [apiCallback({
        callback: (event: UserInputChatEvent) => {
            this.chatMessageCallback?.(event.message)
        },
        type: "userInputChat",
        typeChecker: isUserInputChatEvent
    })]


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
        this.chatMessageCallback = callback
    }
}

export default new WorkadvntureChatCommands()