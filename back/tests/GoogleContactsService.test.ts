import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleContactsService } from "../src/Services/GoogleContacts/GoogleContactsService";
import { GoogleContactsClient } from "../src/Services/GoogleContacts/GoogleContactsClient";
import { getSession } from "../src/Services/GoogleOAuthService";
import { mock, mockDeep } from "vitest-mock-extended";
import { Request } from "express";
import { people_v1 } from "googleapis";

vi.mock("../src/Services/GoogleContacts/GoogleContactsClient");
vi.mock("../src/Services/GoogleOAuthService");

describe("GoogleContactsService", () => {
    let service: GoogleContactsService;
    let client: GoogleContactsClient;

    beforeEach(() => {
        service = new GoogleContactsService();
        client = new GoogleContactsClient();
        vi.mocked(getSession).mockReturnValue({
            googleOAuthTokens: {
                access_token: "access_token",
                refresh_token: "refresh_token",
            },
        } as any);
    });

    it("should get a contact", async () => {
        const mockPerson: people_v1.Schema$Person = {
            resourceName: "people/c12345",
            names: [{ displayName: "John Doe" }],
            emailAddresses: [{ value: "john.doe@example.com" }],
        };
        const mockRequest = mock<Request>();
        const people = mockDeep<people_v1.Resource$People>();
        vi.mocked(client.getAuthenticatedClient).mockReturnValue(people);
        people.get.mockResolvedValue({ data: mockPerson } as any);

        const contact = await service.getContact(mockRequest, "people/c12345");

        expect(contact).toEqual(mockPerson);
        expect(people.get).toHaveBeenCalledWith({
            resourceName: "people/c12345",
            personFields: "names,emailAddresses,phoneNumbers",
        });
    });
});
