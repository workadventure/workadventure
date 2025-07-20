import { calendar_v3 } from "googleapis";
import { Request } from "express";

export class GoogleCalendarService {
    public async createEvent(request: Request, calendarId: string, event: calendar_v3.Schema$Event) {
        console.log("Mocked createEvent called");
        return {
            ...event,
            id: "mock_event_id",
        };
    }

    public async getEvents(request: Request, calendarId: string, timeMin?: string, timeMax?: string) {
        console.log("Mocked getEvents called");
        return [];
    }

    public async updateEvent(request: Request, calendarId: string, eventId: string, event: calendar_v3.Schema$Event) {
        console.log("Mocked updateEvent called");
        return {
            ...event,
            id: eventId,
        };
    }

    public async deleteEvent(request: Request, calendarId: string, eventId: string) {
        console.log("Mocked deleteEvent called");
    }
}
