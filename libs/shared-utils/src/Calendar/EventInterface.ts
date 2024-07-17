export interface CalendarEventInterface {
    id: string;
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    resource?: unknown;
}
