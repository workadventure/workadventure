import { Express, Request, Response } from "express";
import { GoogleContactsService } from "../Services/GoogleContacts/GoogleContactsService";

export class GoogleContactsController {
    private readonly contactsService: GoogleContactsService;

    constructor(private app: Express) {
        this.contactsService = new GoogleContactsService();
        this.app.get("/contacts/:resourceName", this.getContact.bind(this));
        this.app.put("/contacts/:resourceName", this.updateContact.bind(this));
    }

    private async getContact(request: Request, response: Response) {
        try {
            const contact = await this.contactsService.getContact(request, request.params.resourceName);
            response.json(contact);
        } catch (error) {
            console.error(error);
            response.status(500).send("Error retrieving contact");
        }
    }

    private async updateContact(request: Request, response: Response) {
        try {
            const contact = await this.contactsService.updateContact(
                request,
                request.params.resourceName,
                request.body
            );
            response.json(contact);
        } catch (error) {
            console.error(error);
            response.status(500).send("Error updating contact");
        }
    }
}
