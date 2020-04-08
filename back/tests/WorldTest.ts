import "jasmine";
import {Message} from "../src/Model/Websocket/Message";
import {World} from "../src/Model/World";
import {MessageUserPosition, Point} from "../src/Model/Websocket/MessageUserPosition";
import { Group } from "../src/Model/Group";
import {Distance} from "../src/Model//Distance";

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

        //expect(connectCalled).toBe(true);

    }),
    it('Should return the distances between all users', () => {
        let connectCalled: boolean = false;
        let connect = (user1: string, user2: string): void => {
            connectCalled = true;
        }
        let disconnect = (user1: string, user2: string): void => {
            
        }

        let world = new World(connect, disconnect);
        let user1 = new MessageUserPosition({
            userId: "foo",
            roomId: 1,
            position: new Point(100, 100)
        });

        world.join(user1);

        let user2 = new MessageUserPosition({
            userId: "bar",
            roomId: 1,
            position: new Point(500, 100)
        });
        world.join(user2);

        let user3 = new MessageUserPosition({
            userId: "baz",
            roomId: 1,
            position: new Point(101, 100)
        });

        let user4 = new MessageUserPosition({
            userId: "buz",
            roomId: 1,
            position: new Point(105, 100)
        })

        let group = new Group([user1, user2, user3, user4]);

        let distances = world.getDistancesBetweenGroupUsers(group)

        console.log(distances);

        //expect(distances).toBe([]);
    })
})