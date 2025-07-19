import { Express, Request, Response } from "express";
import { GoogleCalendarService } from "../Services/GoogleCalendarService";

export class GoogleCalendarController {
    constructor(private app: Express, private googleCalendarService: GoogleCalendarService) {
        this.createEvent();
        this.getEvents();
        this.updateEvent();
        this.deleteEvent();
    }

    private createEvent() {
        this.app.post("/calendar/events", async (request: Request, response: Response) => {
            try {
                const { calendarId, event } = request.body;
                const newEvent = await this.googleCalendarService.createEvent(request, calendarId, event);
                response.status(201).json(newEvent);
            } catch (error) {
                console.error("Error creating event", error);
                response.status(500).send("Error creating event");
            }
        });
    }

    private getEvents() {
        this.app.get("/calendar/events", async (request: Request, response: Response) => {
            try {
                const { calendarId, timeMin, timeMax } = request.query;
                const events = await this.googleCalendarService.getEvents(
                    request,
                    calendarId as string,
                    timeMin as string,
                    timeMax as string
                );
                response.status(200).json(events);
            } catch (error) {
                console.error("Error getting events", error);
                response.status(500).send("Error getting events");
            }
        });
    }

    private updateEvent() {
        this.app.put("/calendar/events/:eventId", async (request: Request, response: Response) => {
            try {
                const { calendarId, event } = request.body;
                const { eventId } = request.params;
                const updatedEvent = await this.googleCalendarService.updateEvent(
                    request,
                    calendarId,
                    eventId,
                    event
                );
                response.status(200).json(updatedEvent);
            } catch (error) {
                console.error("Error updating event", error);
                response.status(500).send("Error updating event");
            }
        });
    }

    private deleteEvent() {
        this.app.delete("/calendar/events/:eventId", async (request: Request, response: Response) => {
            try {
                const { calendarId } = request.query;
                const { eventId } = request.params;
                await this.googleCalendarService.deleteEvent(request, calendarId as string, eventId);
                response.status(204).send();
            } catch (error) {
                console.error("Error deleting event", error);
                response.status(500).send("Error deleting event");
            }
        });
    }
}
