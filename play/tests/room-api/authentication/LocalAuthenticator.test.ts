import { Status } from "@grpc/grpc-js/build/src/constants";
import { describe, test, expect } from "vitest";
import authenticator from "../../../src/room-api/authentication/LocalAuthenticator";

const roomUrl =
    "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Variables/shared_variables.json";
const apiKey = "MYAWESOMEKEY";

describe("LocalAuthenticator", () => {
    test("With wrong api key", async () => {
        await expect(authenticator("bad key", roomUrl)).resolves.toMatchObject({
            success: false,
            code: Status.UNAUTHENTICATED,
            details: "Wrong API key",
        });
    });

    test("With good api key but wrong room url", async () => {
        await expect(authenticator(apiKey, "http://baddomain.fr/_/test/myroom")).resolves.toMatchObject({
            success: false,
            code: Status.PERMISSION_DENIED,
            details: "You cannot interact with this room!",
        });
    });
});
