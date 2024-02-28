import { Status } from "@grpc/grpc-js/build/src/constants";
import { describe, test, expect, vi, beforeAll, it } from "vitest";
import authenticator from "../../../src/room-api/authentication/LocalAuthenticator";
import { GuardError } from "../../../src/room-api/types/GuardError";

const roomUrl =
    "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json";
const apiKey = "MYAWESOMEKEY";

describe("LocalAuthenticator", () => {
    beforeAll(() => {
        vi.mock("../../../src/pusher/enums/EnvironmentVariable", () => {
            return {
                FRONT_URL: "http://play.workadventure.localhost",
                ROOM_API_SECRET_KEY: "MYAWESOMEKEY",
            };
        });
    });

    test("with wrong api key", async () => {
        let thrownError: unknown;

        try {
            await authenticator("bad key", roomUrl);
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(GuardError);

        if (thrownError instanceof GuardError) {
            expect(thrownError.code).toEqual(Status.UNAUTHENTICATED);
            expect(thrownError.details).toEqual("Wrong API key");
        }
    });

    test("with good api key but wrong room url", async () => {
        let thrownError: unknown;

        try {
            await authenticator(apiKey, "http://baddomain.fr/_/test/myroom");
        } catch (error) {
            thrownError = error;
        }

        expect(thrownError).toBeInstanceOf(GuardError);

        if (thrownError instanceof GuardError) {
            expect(thrownError.code).toEqual(Status.PERMISSION_DENIED);
            expect(thrownError.details).toEqual("You cannot interact with this room!");
        }
    });

    it("should be authenticated", async () => {
        await expect(authenticator(apiKey, roomUrl)).resolves.not.toThrow();
    });
});
