export interface CalendarEventInterface {
    id: string;
    title: string;
    description: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    resource?: {
        body?: {
            content?: string;
            contentType?: string;
        };
        onlineMeeting?: {
            joinUrl?: string;
            passcode?: string;
        };
    };
}
