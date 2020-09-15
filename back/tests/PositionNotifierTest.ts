import "jasmine";
import {World, ConnectCallback, DisconnectCallback } from "../src/Model/World";
import {Point} from "../src/Model/Websocket/MessageUserPosition";
import { Group } from "../src/Model/Group";
import {PositionNotifier} from "../src/Model/PositionNotifier";
import {UserInterface} from "../src/Model/UserInterface";
import {PointInterface} from "../src/Model/Websocket/PointInterface";
import {Zone} from "_Model/Zone";

function move(user: UserInterface, x: number, y: number, positionNotifier: PositionNotifier): void {
    positionNotifier.updatePosition(user, {
        x,
        y,
        moving: false,
        direction: 'down'
    });
    user.position.x = x;
    user.position.y = y;
}

describe("PositionNotifier", () => {
    it("should receive notifications when player moves", () => {
        let enterTriggered = false;
        let moveTriggered = false;
        let leaveTriggered = false;

        const positionNotifier = new PositionNotifier(300, 300, (user: UserInterface) => {
            enterTriggered = true;
        }, (user: UserInterface, position: PointInterface) => {
            moveTriggered = true;
        }, (user: UserInterface) => {
            leaveTriggered = true;
        });

        const user1 = {
            id: "1",
            position: {
                x: 500,
                y: 500,
                moving: false,
                direction: 'down'
            },
            listenedZones: new Set<Zone>(),
        } as UserInterface;

        const user2 = {
            id: "2",
            position: {
                x: -9999,
                y: -9999,
                moving: false,
                direction: 'down'
            },
            listenedZones: new Set<Zone>(),
        } as UserInterface;

        positionNotifier.setViewport(user1, {
            left: 200,
            right: 600,
            top: 100,
            bottom: 500
        });

        move(user2, 500, 500, positionNotifier);

        expect(enterTriggered).toBe(true);
        expect(moveTriggered).toBe(false);
        enterTriggered = false;

        // Move inside the zone
        move(user2, 501, 500, positionNotifier);

        expect(enterTriggered).toBe(false);
        expect(moveTriggered).toBe(true);
        moveTriggered = false;

        // Move out of the zone in a zone that we don't track
        move(user2, 901, 500, positionNotifier);

        expect(enterTriggered).toBe(false);
        expect(moveTriggered).toBe(false);
        expect(leaveTriggered).toBe(true);
        leaveTriggered = false;

        // Move back in
        move(user2, 500, 500, positionNotifier);
        expect(enterTriggered).toBe(true);
        expect(moveTriggered).toBe(false);
        expect(leaveTriggered).toBe(false);
        enterTriggered = false;

        // Move out of the zone in a zone that we do track
        move(user2, 200, 500, positionNotifier);
        expect(enterTriggered).toBe(false);
        expect(moveTriggered).toBe(true);
        expect(leaveTriggered).toBe(false);
        moveTriggered = false;

        // Leave the room
        positionNotifier.leave(user2);
        expect(enterTriggered).toBe(false);
        expect(moveTriggered).toBe(false);
        expect(leaveTriggered).toBe(true);
        leaveTriggered = false;
    });

    it("should receive notifications when camera moves", () => {
        let enterTriggered = false;
        let moveTriggered = false;
        let leaveTriggered = false;

        const positionNotifier = new PositionNotifier(300, 300, (user: UserInterface) => {
            enterTriggered = true;
        }, (user: UserInterface, position: PointInterface) => {
            moveTriggered = true;
        }, (user: UserInterface) => {
            leaveTriggered = true;
        });

        const user1 = {
            id: "1",
            position: {
                x: 500,
                y: 500,
                moving: false,
                direction: 'down'
            },
            listenedZones: new Set<Zone>(),
        } as UserInterface;

        const user2 = {
            id: "2",
            position: {
                x: -9999,
                y: -9999,
                moving: false,
                direction: 'down'
            },
            listenedZones: new Set<Zone>(),
        } as UserInterface;

        positionNotifier.setViewport(user1, {
            left: 200,
            right: 600,
            top: 100,
            bottom: 500
        });

        move(user2, 500, 500, positionNotifier);

        expect(enterTriggered).toBe(true);
        expect(moveTriggered).toBe(false);
        enterTriggered = false;

        // Move the viewport but the user stays inside.
        positionNotifier.setViewport(user1, {
            left: 201,
            right: 601,
            top: 100,
            bottom: 500
        });

        expect(enterTriggered).toBe(false);
        expect(moveTriggered).toBe(false);
        expect(leaveTriggered).toBe(false);

        // Move the viewport out of the user.
        positionNotifier.setViewport(user1, {
            left: 901,
            right: 1001,
            top: 100,
            bottom: 500
        });

        expect(enterTriggered).toBe(false);
        expect(moveTriggered).toBe(false);
        expect(leaveTriggered).toBe(true);
        leaveTriggered = false;

        // Move the viewport back on the user.
        positionNotifier.setViewport(user1, {
            left: 200,
            right: 600,
            top: 100,
            bottom: 500
        });

        expect(enterTriggered).toBe(true);
        expect(moveTriggered).toBe(false);
        expect(leaveTriggered).toBe(false);
        enterTriggered = false;
    });
})
