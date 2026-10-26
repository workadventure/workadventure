import { Marked } from "marked";
import { MsgType } from "matrix-js-sdk";
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events";
import type { PictureStore } from "../Stores/PictureStore";

/**
 * A mention travels as a pill in the message HTML:
 * - as our composer writes it: `<a data-mention="<encoded id>">Name</a>`, the id being a Matrix user id or, in
 *   the proximity chat, a space user id (which embeds the room URL, hence the encoding);
 * - as Element writes it, and as we send it to Matrix: `<a href="https://matrix.to/#/@user:server">Name</a>`.
 */
const PILL_REGEX = /<a\b([^>]*)>([^<]*)<\/a>/g;
const MATRIX_PERMALINK_PREFIX = "https://matrix.to/#/";
export const MATRIX_HTML_FORMAT = "org.matrix.custom.html";

export type MentionCandidate = {
    id: string;
    name: string;
    /** Other words that find it after an "@". */
    keywords?: string[];
    pictureStore?: PictureStore;
    color?: string;
    /** Connected to the world right now. */
    online?: boolean;
};

/**
 * "@room" notifies everyone in the conversation. Like Element, it is only offered to the members allowed to: the
 * power level for notifications.room in a Matrix room (which the server checks too), the admins of the map in the
 * proximity chat (which every receiver checks, there is no server in between).
 */
export const ROOM_MENTION_ID = "@room";
export const ROOM_MENTION: MentionCandidate = { id: ROOM_MENTION_ID, name: "room", keywords: ["all", "tous"] };

function decode(value: string): string | undefined {
    try {
        return decodeURIComponent(value);
    } catch {
        return undefined;
    }
}

function getPillId(attributes: string): string | undefined {
    const dataMention = /\bdata-mention="([^"]+)"/.exec(attributes)?.[1];
    if (dataMention !== undefined) {
        return decode(dataMention);
    }
    const permalink = /\bhref="https:\/\/matrix\.to\/#\/((?:@|%40)[^"/?]+)"/.exec(attributes)?.[1];
    return permalink === undefined ? undefined : decode(permalink);
}

/** The pill our composer inserts: not editable, so that the caret jumps over it and a backspace removes it whole. */
export function createMentionPill(candidate: MentionCandidate): HTMLAnchorElement {
    const pill = document.createElement("a");
    pill.dataset.mention = encodeURIComponent(candidate.id);
    pill.contentEditable = "false";
    pill.textContent = candidate.name;
    return pill;
}

/** The name being typed right before the caret after an "@", if the user is typing a mention. */
export function findMentionQuery(textBeforeCaret: string): string | undefined {
    return /(?:^|\s)@([^\s@]*)$/.exec(textBeforeCaret)?.[1];
}

export function getMentionedIds(html: string): string[] {
    const ids = [...html.matchAll(PILL_REGEX)].flatMap(([, attributes]) => getPillId(attributes) ?? []);
    return [...new Set(ids)];
}

/**
 * The message as plain text, its pills as "@Name": for the Matrix body, notifications and the scripting API. The
 * composer hands over its innerHTML, so the entities (&nbsp; after a pill, &amp;...) are decoded too.
 */
export function mentionsToPlainText(html: string): string {
    const withNames = html
        .replace(PILL_REGEX, (pill, attributes: string, name: string) =>
            getPillId(attributes) === undefined ? pill : `@${name}`,
        )
        .replace(/<br\s*\/?>/gi, "\n");
    return new DOMParser().parseFromString(withNames, "text/html").body.textContent ?? "";
}

/** Flags the pills naming the current user, so that the timeline can color them. */
export function markOwnMentions(html: string, ownIds: readonly string[]): string {
    return html.replace(PILL_REGEX, (pill, attributes: string) => {
        const id = getPillId(attributes);
        return id !== undefined && ownIds.includes(id) ? pill.replace("<a", "<a data-mention-me") : pill;
    });
}

/** Element writes "@room" as plain text and draws the pill itself: so do we. */
export function pillRoomMention(text: string): string {
    return text.replace(/(^|[\s>(])@room\b/g, `$1<a data-mention="${encodeURIComponent(ROOM_MENTION_ID)}">room</a>`);
}

/** The "@room" pills of a sender who may not notify everyone, back to plain text. */
export function withoutRoomMention(html: string): string {
    return html.replace(PILL_REGEX, (pill, attributes: string) =>
        getPillId(attributes) === ROOM_MENTION_ID ? ROOM_MENTION_ID : pill,
    );
}

/**
 * The content of a text message typed in our composer. Mentioned users go in m.mentions, which is what makes the
 * server notify them (intentional mentions, Matrix v1.7), and their pills become matrix.to links in an HTML
 * formatted_body, which is what Element renders as pills.
 */
export function getMatrixMessageContent(message: string): RoomMessageEventContent {
    const ids = getMentionedIds(message);
    if (ids.length === 0) {
        // m.mentions is set even when empty: like Element, we tell the server not to guess mentions from the
        // display names found in the text.
        return { msgtype: MsgType.Text, body: message, formatted_body: message, "m.mentions": {} };
    }

    const userIds = ids.filter((id) => id !== ROOM_MENTION_ID);
    const markdown = message.replace(PILL_REGEX, (pill, attributes: string, name: string) => {
        const id = getPillId(attributes);
        if (id === undefined) {
            return pill;
        }
        // Like Element, "@room" stays plain text: m.mentions.room is what notifies.
        return id === ROOM_MENTION_ID ? ROOM_MENTION_ID : `<a href="${MATRIX_PERMALINK_PREFIX}${id}">${name}</a>`;
    });
    return {
        msgtype: MsgType.Text,
        body: mentionsToPlainText(message),
        format: MATRIX_HTML_FORMAT,
        formatted_body: new Marked({ breaks: true }).parse(markdown, { async: false }).trim(),
        "m.mentions": {
            ...(userIds.length > 0 ? { user_ids: userIds } : {}),
            ...(ids.includes(ROOM_MENTION_ID) ? { room: true } : {}),
        },
    };
}
