import "jasmine";
import {Message} from "../src/Model/Websocket/Message";

describe("Message Model", () => {
    it("should find userId and roomId", () => {
        let message = JSON.stringify({userId: "test1", roomId: "test2"});
        let messageObject = new Message(message);
        expect(messageObject.userId).toBe("test1");
        expect(messageObject.roomId).toBe("test2");
    })

    it("should expose a toJson method", () => {
        let message = JSON.stringify({userId: "test1", roomId: "test2"});
        let messageObject = new Message(message);
        expect(messageObject.toJson()).toEqual({userId: "test1", roomId: "test2"});
    })

    it("should find throw error when no userId", () => {
        let message = JSON.stringify({roomId: "test2"});
        expect(() => {
            let messageObject = new Message(message);
        }).toThrow(new Error("userId or roomId cannot be null"));
    })

    it("should find throw error when no roomId", () => {
        let message = JSON.stringify({userId: "test1"});
        expect(() => {
            let messageObject = new Message(message);
        }).toThrow(new Error("userId or roomId cannot be null"));
    })
})