import "jasmine";
import {Message} from "../src/Model/Websocket/Message";

describe("Message Model", () => {
    it("should find userId and roomId", () => {
        let message = {userId: "test1", roomId: "test2", name: "foo"};
        let messageObject = new Message(message);
        expect(messageObject.userId).toBe("test1");
        expect(messageObject.roomId).toBe("test2");
        expect(messageObject.name).toBe("foo");
    })

    it("should expose a toJson method", () => {
        let message = {userId: "test1", roomId: "test2", name: "foo"};
        let messageObject = new Message(message);
        expect(messageObject.toJson()).toEqual({userId: "test1", roomId: "test2", name: "foo"});
    })

    it("should find throw error when no userId", () => {
        let message = {roomId: "test2"};
        expect(() => {
            let messageObject = new Message(message);
        }).toThrow(new Error("userId or roomId cannot be null"));
    })

    it("should find throw error when no roomId", () => {
        let message = {userId: "test1"};
        expect(() => {
            let messageObject = new Message(message);
        }).toThrow(new Error("userId or roomId cannot be null"));
    })

    it("should find throw error when no roomId", () => {
        let message = {name: "foo"};
        expect(() => {
            let messageObject = new Message(message);
        }).toThrow(new Error("userId or roomId cannot be null"));
    })
})