import { calendar_v3, google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getOAuth2Client, getSession } from "./GoogleOAuthService";
import { Request } from "express";

export class GoogleCalendarService {
    private getCalendar(request: Request): calendar_v3.Calendar {
        const oauth2Client = this.getAuthenticatedClient(request);
        return google.calendar({ version: "v3", auth: oauth2Client });
    }

    private getAuthenticatedClient(request: Request): OAuth2Client {
        const session = getSession(request);
        if (!session.googleOAuthTokens) {
            throw new Error("User not authenticated");
        }
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials(session.googleOAuthTokens);
        return oauth2Client;
    }

    public async createEvent(request: Request, calendarId: string, event: calendar_v3.Schema$Event) {
        const calendar = this.getCalendar(request);
        const response = await calendar.events.insert({
            calendarId,
            requestBody: event,
        });
        return response.data;
    }

    public async getEvents(request: Request, calendarId: string, timeMin?: string, timeMax?: string) {
        const calendar = this.getCalendar(request);
        const response = await calendar.events.list({
            calendarId,
            timeMin,
            timeMax,
        });
        return response.data.items;
    }

    public async updateEvent(request: Request, calendarId: string, eventId: string, event: calendar_v3.Schema$Event) {
        const calendar = this.getCalendar(request);
        const response = await calendar.events.update({
            calendarId,
            eventId,
            requestBody: event,
        });
        return response.data;
    }

    public async deleteEvent(request: Request, calendarId: string, eventId: string) {
        const calendar = this.getCalendar(request);
        await calendar.events.delete({
            calendarId,
            eventId,
        });
    }
}
