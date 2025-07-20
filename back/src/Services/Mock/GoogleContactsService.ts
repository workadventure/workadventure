import { people_v1 } from "googleapis";
import { Request } from "express";

export class GoogleContactsService {
    public async getContact(request: Request, resourceName: string): Promise<people_v1.Schema$Person> {
        console.log("Mocked getContact called");
        return {
            resourceName: resourceName,
            names: [
                {
                    displayName: "John Doe",
                },
            ],
            emailAddresses: [
                {
                    value: "john.doe@example.com",
                },
            ],
            phoneNumbers: [
                {
                    value: "123-456-7890",
                },
            ],
        };
    }

    public async updateContact(
        request: Request,
        resourceName: string,
        person: people_v1.Schema$Person
    ): Promise<people_v1.Schema$Person> {
        console.log("Mocked updateContact called");
        return person;
    }
}
