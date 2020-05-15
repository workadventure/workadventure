import "jasmine";
import {Message} from "../src/Model/Websocket/Message";

describe("Message Model", () => {
    it("should find userId and roomId", () => {
        let message = {userId: "test1", name: "foo", character: "user"};
        let messageObject = new Message(message);
        expect(messageObject.userId).toBe("test1");
        expect(messageObject.name).toBe("foo");
        expect(messageObject.character).toBe("user");
    })

    it("should find throw error when no userId", () => {
        let message = {};
        expect(() => {
            let messageObject = new Message(message);
        }).toThrow(new Error("userId cannot be null"));
    });
})
