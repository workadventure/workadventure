import { get, writable, type Readable, type Unsubscriber } from "svelte/store";
import { LL } from "../../i18n/i18n-svelte";
import type { RaisedHandSection } from "../Space/SpaceInterface";

export type Politeness = "polite" | "assertive";

export interface Announcement {
    id: number;
    message: string;
    politeness: Politeness;
}

/**
 * How long an announcement stays in its live region. Screen readers queue the text when it is added, so it can go soon
 * after; while it is there, the visible text it repeats (a toast) is in the page twice.
 */
export const ANNOUNCEMENT_LIFETIME_MS = 1_500;
/** The same message again within this delay is dropped (two stores reporting one event, a quick re-render). */
export const DUPLICATE_WINDOW_MS = 1_000;

/**
 * What the two live regions of LiveAnnouncer.svelte (mounted once in App.svelte) hold. Each announcement is added as
 * a new node, so a screen reader reads it even when the same text was announced a moment before.
 */
export const liveAnnouncementsStore = writable<Announcement[]>([]);

let nextId = 0;
const lastAnnouncedAt = new Map<string, number>();

/**
 * Has screen readers read `message`, without moving the focus. "polite" waits for the reader to finish what it is
 * saying, "assertive" interrupts it: keep that for what needs an answer or went wrong.
 */
export function announce(message: string, politeness: Politeness = "polite"): void {
    const text = message.replace(/\s+/g, " ").trim();
    if (text === "") return;

    const key = `${politeness}:${text}`;
    const now = Date.now();
    if (now - (lastAnnouncedAt.get(key) ?? -Infinity) < DUPLICATE_WINDOW_MS) return;
    lastAnnouncedAt.set(key, now);

    const announcement = { id: nextId++, message: text, politeness };
    liveAnnouncementsStore.update((announcements) => [...announcements, announcement]);
    setTimeout(() => {
        lastAnnouncedAt.delete(key);
        liveAnnouncementsStore.update((announcements) => announcements.filter((a) => a !== announcement));
    }, ANNOUNCEMENT_LIFETIME_MS);
}

const EXCERPT_LENGTH = 140;

/**
 * Announces a message someone else sent, the way it is shown on screen: in the open conversation, in a banner of the
 * chat (direct message, mention) or in a toast over the map (chat closed). The caller only calls it for those cases.
 */
export function announceChatMessage(
    sender: string,
    body: string,
    roomName: string,
    { displayed, direct, mentionsMe }: { displayed: boolean; direct: boolean; mentionsMe: boolean },
): void {
    const plain = body.replace(/\s+/g, " ").trim();
    const excerpt = plain.length > EXCERPT_LENGTH ? `${plain.slice(0, EXCERPT_LENGTH)}…` : plain;
    const a11y = get(LL).notification.a11y;
    if (displayed) {
        announce(a11y.chatMessage({ sender, excerpt }));
    } else if (direct) {
        announce(a11y.directMessage({ sender, excerpt }));
    } else if (mentionsMe) {
        announce(a11y.mention({ sender, room: roomName, excerpt }));
    } else {
        announce(a11y.roomMessage({ sender, room: roomName, excerpt }));
    }
}

/**
 * Announces each hand raised by someone else. A space has a section only while hands are up, so a space without one
 * has none raised. Only the hands up when this starts are not announced.
 */
export function watchRaisedHands(sectionsStore: Readable<RaisedHandSection[]>): Unsubscriber {
    let raisedHandsBySpace: Map<string, Set<string>> | undefined;
    return sectionsStore.subscribe((sections) => {
        const next = new Map<string, Set<string>>();
        for (const section of sections) {
            const spaceName = section.space.getName();
            const before = raisedHandsBySpace?.get(spaceName) ?? new Set<string>();
            for (const hand of section.hands) {
                if (
                    raisedHandsBySpace &&
                    !before.has(hand.spaceUserId) &&
                    hand.spaceUserId !== section.space.mySpaceUserId
                ) {
                    announce(get(LL).notification.a11y.handRaised({ name: hand.name }));
                }
            }
            next.set(spaceName, new Set(section.hands.map((hand) => hand.spaceUserId)));
        }
        raisedHandsBySpace = next;
    });
}
