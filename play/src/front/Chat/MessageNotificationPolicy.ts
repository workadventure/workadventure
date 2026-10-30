export interface IncomingMessage {
    /** The chat panel is open. */
    chatVisible: boolean;
    /** The chat panel is open on the conversation the message belongs to. */
    roomDisplayed: boolean;
    /** The conversation is muted (mentions still get through). */
    muted: boolean;
    /** The message mentions the current user, @room included. */
    mentionsMe: boolean;
    /** The message is in a direct conversation. */
    direct: boolean;
}

export interface MessageNotificationPlan {
    sound: boolean;
    /** The toast over the map. */
    toast: boolean;
    /** The banner at the top of the open chat. */
    banner: boolean;
    /** The browser notification (only shown while the tab has no focus). */
    browser: boolean;
}

const NOTHING: MessageNotificationPlan = { sound: false, toast: false, banner: false, browser: false };

/**
 * How to signal a new message from someone else.
 * Chat closed: sound and toast over the map. Chat open on another conversation: a room message only raises the unread
 * count, a mention or a direct message shows a banner in the chat, with a sound.
 */
export function planMessageNotification(message: IncomingMessage): MessageNotificationPlan {
    if (message.roomDisplayed || (message.muted && !message.mentionsMe)) {
        return NOTHING;
    }
    if (!message.chatVisible) {
        return { sound: true, toast: true, banner: false, browser: true };
    }
    const important = message.mentionsMe || message.direct;
    return { sound: important, toast: false, banner: important, browser: true };
}
