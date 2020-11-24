import "jasmine";
import {Room} from "../../../src/Connexion/Room";

describe("Room getIdFromIdentifier()", () => {
    it("should work with an absolute room id and no hash as parameter", () => {
        const {roomId, hash} = Room.getIdFromIdentifier('/_/global/maps.workadventu.re/test2.json', '', '');
        expect(roomId).toEqual('_/global/maps.workadventu.re/test2.json');
        expect(hash).toEqual('');
    });
    it("should work with an absolute room id and a hash as parameters", () => {
        const {roomId, hash} = Room.getIdFromIdentifier('/_/global/maps.workadventu.re/test2.json#start', '', '');
        expect(roomId).toEqual('_/global/maps.workadventu.re/test2.json');
        expect(hash).toEqual("start");
    });
    it("should work with an absolute room id, regardless of baseUrl or instance", () => {
        const {roomId, hash} = Room.getIdFromIdentifier('/_/global/maps.workadventu.re/test2.json', 'https://another.domain/_/global/test.json', 'lol');
        expect(roomId).toEqual('_/global/maps.workadventu.re/test2.json');
        expect(hash).toEqual('');
    });
    
    
    it("should work with a relative file link and no hash as parameters", () => {
        const {roomId, hash} = Room.getIdFromIdentifier('./test2.json', 'https://maps.workadventu.re/test.json', 'global');
        expect(roomId).toEqual('_/global/maps.workadventu.re/test2.json');
        expect(hash).toEqual('');
    });
    it("should work with a relative file link with no dot", () => {
        const {roomId, hash} = Room.getIdFromIdentifier('test2.json', 'https://maps.workadventu.re/test.json', 'global');
        expect(roomId).toEqual('_/global/maps.workadventu.re/test2.json');
        expect(hash).toEqual('');
    });
    it("should work with a relative file link two levels deep", () => {
        const {roomId, hash} = Room.getIdFromIdentifier('../floor1/Floor1.json', 'https://maps.workadventu.re/floor0/Floor0.json', 'global');
        expect(roomId).toEqual('_/global/maps.workadventu.re/floor1/Floor1.json');
        expect(hash).toEqual('');
    });
    it("should work with a relative file link and a hash as parameters", () => {
        const {roomId, hash} = Room.getIdFromIdentifier('./test2.json#start', 'https://maps.workadventu.re/test.json', 'global');
        expect(roomId).toEqual('_/global/maps.workadventu.re/test2.json');
        expect(hash).toEqual("start");
    });
});