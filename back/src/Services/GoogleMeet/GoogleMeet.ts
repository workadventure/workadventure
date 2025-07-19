import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

class GoogleMeet {
    private calendar;

    constructor(auth: OAuth2Client) {
        this.calendar = google.calendar({ version: 'v3', auth });
    }

    async createMeetConference(roomName: string, participants: string[]) {
        const event = {
            summary: roomName,
            description: 'Google Meet conference',
            start: {
                dateTime: new Date().toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
                timeZone: 'UTC',
            },
            attendees: participants.map(email => ({ email })),
            conferenceData: {
                createRequest: {
                    requestId: 'sample-request',
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet',
                    },
                },
            },
        };

        const res = await this.calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1,
        });

        return res.data.hangoutLink;
    }
}

export { GoogleMeet };
