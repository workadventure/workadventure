import type { CalendarEventInterface } from "@workadventure/shared-utils";

export async function createEvent(
    calendarId: string,
    event: Partial<CalendarEventInterface>
): Promise<CalendarEventInterface | undefined> {
    const response = await fetch("/calendar/events", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ calendarId, event }),
    });
    if (response.ok) {
        return await response.json();
    }
    return undefined;
}
