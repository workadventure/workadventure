import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET } from "../../Enum/EnvironmentVariable";

export class GoogleContactsClient {
    private readonly oAuth2Client: OAuth2Client;

    constructor() {
        this.oAuth2Client = new OAuth2Client(
            GOOGLE_OAUTH_CLIENT_ID,
            GOOGLE_OAUTH_CLIENT_SECRET
        );
    }

    public getAuthenticatedClient(accessToken: string, refreshToken: string) {
        this.oAuth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
            scope: "https://www.googleapis.com/auth/contacts",
        });
        google.options({ auth: this.oAuth2Client });
        return google.people("v1");
    }
}
