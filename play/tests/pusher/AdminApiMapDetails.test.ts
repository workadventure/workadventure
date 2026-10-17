import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/pusher/enums/EnvironmentVariable", () => import("./mocks/pusherEnvironmentVariableMock"));

import { adminApi } from "../../src/pusher/services/AdminApi";

describe("AdminApi.fetchMapDetails", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("never hands the world's third-party secrets on", async () => {
        vi.spyOn(axios, "get").mockResolvedValue({
            status: 200,
            data: {
                mapUrl: "http://maps.test/map.json",
                group: null,
                thirdParty: {
                    jitsi: { url: "jitsi.test", iss: "iss", secret: "jitsi-secret" },
                    bbb: { url: "https://bbb.test/bigbluebutton/", secret: "bbb-secret" },
                },
            },
        });

        const mapDetails = await adminApi.fetchMapDetails("http://play.test/@/team/world/room");

        expect(mapDetails).toMatchObject({ mapUrl: "http://maps.test/map.json" });
        expect(JSON.stringify(mapDetails)).not.toMatch(/secret/);
    });
});
