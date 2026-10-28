import { formatUnreadCount } from "./Components/unreadCount";

const UNREAD_PREFIX = /^\(\d+\+?\) /;

/** The tab title with the unread count in front, "(3) WorkAdventure", or without it when nothing is unread. */
export function withUnreadCount(title: string, count: number): string {
    const base = title.replace(UNREAD_PREFIX, "");
    return count > 0 ? `(${formatUnreadCount(count)}) ${base}` : base;
}
