export const MAX_DISPLAYED_UNREAD_COUNT = 99;

export function formatUnreadCount(count: number): string {
    return count > MAX_DISPLAYED_UNREAD_COUNT ? `${MAX_DISPLAYED_UNREAD_COUNT}+` : String(count);
}
