import { describe, expect, it } from "vitest";
import { CheckedIframeMessagePort } from "../CheckedIframeMessagePort";
import { Space } from "./Space";
import type { SpaceUser } from "./SpaceUser";

const bob = {
    spaceUserId: "bob",
    name: "Bob",
    playUri: "",
    isLogged: false,
    availabilityStatus: 1,
    tags: [],
    cameraState: false,
    microphoneState: false,
    screenSharingState: false,
    megaphoneState: true,
    uuid: "bob-uuid",
    showVoiceIndicator: false,
};

describe("Space (scripting API)", () => {
    it("does not report an update of a user as a new user", async () => {
        const channel = new MessageChannel();
        const space = new Space(new CheckedIframeMessagePort(channel.port1, "joinSpace"));
        const joined: SpaceUser[] = [];
        const subscription = space.userJoinedObservable.subscribe((user) => joined.push(user));

        // Registered after the Space's own handler, so it runs once the Space has handled each message.
        let count = 0;
        const bothHandled = new Promise<void>((resolve) => {
            function onMessage(): void {
                if (++count === 2) {
                    channel.port1.removeEventListener("message", onMessage);
                    resolve();
                }
            }
            channel.port1.addEventListener("message", onMessage);
        });

        channel.port2.postMessage({ type: "onNewUser", data: bob });
        channel.port2.postMessage({
            type: "onUpdateUser",
            data: { spaceUserId: "bob", changes: { showVoiceIndicator: true }, updateMask: ["showVoiceIndicator"] },
        });
        await bothHandled;

        expect(joined).toHaveLength(1);
        expect(joined[0].showVoiceIndicator).toBe(true);

        subscription.unsubscribe();
        channel.port1.close();
        channel.port2.close();
    });
});
