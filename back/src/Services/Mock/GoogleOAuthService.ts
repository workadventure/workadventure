import { OAuth2Client } from "google-auth-library";
import { Request } from "express";

export function getOAuth2Client(): OAuth2Client {
    return {
        _events: {},
        _eventsCount: 0,
        _maxListeners: undefined,
        authUrl: "http://localhost",
        credentials: {},
        gtoken: {},
        transporter: {},
    } as unknown as OAuth2Client;
}

export function getSession(request: Request) {
    return {
        googleOAuthTokens: {
            access_token: "demo_access_token",
            refresh_token: "demo_refresh_token",
            scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/contacts.readonly",
            token_type: "Bearer",
            expiry_date: new Date().getTime() + 3600 * 1000,
        },
    };
}
