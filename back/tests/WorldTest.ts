import "jasmine";
import {World, ConnectCallback, DisconnectCallback } from "../src/Model/World";
import {Point} from "../src/Model/Websocket/MessageUserPosition";
import { Group } from "../src/Model/Group";

describe("World", () => {
    it("should connect user1 and user2", () => {
        let connectCalledNumber: number = 0;
        const connect: ConnectCallback = (user: string, group: Group): void => {
            connectCalledNumber++;
        }
        const disconnect: DisconnectCallback = (user: string, group: Group): void => {

        }

        const world = new World(connect, disconnect, 160, 160, () => {}, () => {});

        world.join({ userId: "foo" }, new Point(100, 100));

        world.join({ userId: "bar" }, new Point(500, 100));

        world.updatePosition({ userId: "bar" }, new Point(261, 100));

        expect(connectCalledNumber).toBe(0);

        world.updatePosition({ userId: "bar" }, new Point(101, 100));

        expect(connectCalledNumber).toBe(2);

        world.updatePosition({ userId: "bar" }, new Point(102, 100));
        expect(connectCalledNumber).toBe(2);
    });

    it("should connect 3 users", () => {
        let connectCalled: boolean = false;
        const connect: ConnectCallback = (user: string, group: Group): void => {
            connectCalled = true;
        }
        const disconnect: DisconnectCallback = (user: string, group: Group): void => {

        }

        const world = new World(connect, disconnect, 160, 160, () => {}, () => {});

        world.join({ userId: "foo" }, new Point(100, 100));

        world.join({ userId: "bar" }, new Point(200, 100));

        expect(connectCalled).toBe(true);
        connectCalled = false;

        // baz joins at the outer limit of the group
        world.join({ userId: "baz" }, new Point(311, 100));

        expect(connectCalled).toBe(false);

        world.updatePosition({ userId: "baz" }, new Point(309, 100));

        expect(connectCalled).toBe(true);
    });

    it("should disconnect user1 and user2", () => {
        let connectCalled: boolean = false;
        let disconnectCallNumber: number = 0;
        const connect: ConnectCallback = (user: string, group: Group): void => {
            connectCalled = true;
        }
        const disconnect: DisconnectCallback = (user: string, group: Group): void => {
            disconnectCallNumber++;
        }

        const world = new World(connect, disconnect, 160, 160, () => {}, () => {});

        world.join({ userId: "foo" }, new Point(100, 100));

        world.join({ userId: "bar" }, new Point(259, 100));

        expect(connectCalled).toBe(true);
        expect(disconnectCallNumber).toBe(0);

        world.updatePosition({ userId: "bar" }, new Point(100+160+160+1, 100));

        expect(disconnectCallNumber).toBe(2);

        world.updatePosition({ userId: "bar" }, new Point(262, 100));
        expect(disconnectCallNumber).toBe(2);
    });

})
