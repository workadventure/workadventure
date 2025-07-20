import { google, people_v1 } from "googleapis";
import { GoogleContactsClient } from "./GoogleContactsClient";
import { getSession } from "../GoogleOAuthService";
import { Request } from "express";

export class GoogleContactsService {
    private readonly client: GoogleContactsClient;

    constructor() {
        this.client = new GoogleContactsClient();
    }

    public async getContact(request: Request, resourceName: string): Promise<people_v1.Schema$Person> {
        const session = getSession(request);
        const tokens = session.googleOAuthTokens;
        if (!tokens || !tokens.access_token || !tokens.refresh_token) {
            throw new Error("User not authenticated");
        }
        const people = this.client.getAuthenticatedClient(tokens.access_token, tokens.refresh_token);
        const response = await people.people.get({
            resourceName,
            personFields: "names,emailAddresses,phoneNumbers",
        });
        return response.data;
    }

    public async updateContact(
        request: Request,
        resourceName: string,
        person: people_v1.Schema$Person
    ): Promise<people_v1.Schema$Person> {
        const session = getSession(request);
        const tokens = session.googleOAuthTokens;
        if (!tokens || !tokens.access_token || !tokens.refresh_token) {
            throw new Error("User not authenticated");
        }
        const people = this.client.getAuthenticatedClient(tokens.access_token, tokens.refresh_token);
        const response = await people.people.updateContact({
            resourceName,
            updatePersonFields: "names,emailAddresses,phoneNumbers",
            requestBody: person,
        });
        return response.data;
    }
}
