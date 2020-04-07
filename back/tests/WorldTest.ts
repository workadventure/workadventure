import "jasmine";
import {Message} from "../src/Model/Websocket/Message";
import {World} from "../src/Model/World";
import {MessageUserPosition, Point} from "../src/Model/Websocket/MessageUserPosition";

describe("World", () => {
    it("should connect user1 and user2", () => {
        let connectCalled: boolean = false;
        let connect = (user1: string, user2: string): void => {
            connectCalled = true;
        }
        let disconnect = (user1: string, user2: string): void => {
            
        }

        let world = new World(connect, disconnect);

        world.join(new MessageUserPosition({
            userId: "foo",
            roomId: 1,
            position: new Point(100, 100)
        }));

        world.join(new MessageUserPosition({
            userId: "bar",
            roomId: 1,
            position: new Point(500, 100)
        }));

        world.updatePosition(new MessageUserPosition({
            userId: "bar",
            roomId: 1,
            position: new Point(101, 100)
        }));

        expect(connectCalled).toBe(true);

    })
})