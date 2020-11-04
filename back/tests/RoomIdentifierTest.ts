import {extractDataFromPrivateRoomId, extractRoomSlugPublicRoomId, isRoomAnonymous} from "../src/Model/RoomIdentifier";

describe("RoomIdentifier", () => {
    it("should flag public id as anonymous", () => {
        expect(isRoomAnonymous('_/global/test')).toBe(true);
    });
    it("should flag public id as not anonymous", () => {
        expect(isRoomAnonymous('@/afup/afup2020/1floor')).toBe(false);
    });
    it("should extract roomSlug from public ID", () => {
        expect(extractRoomSlugPublicRoomId('_/global/npeguin/test.json')).toBe('npeguin/test.json');
    });
    it("should extract correct from private ID", () => {
        const {organizationSlug, worldSlug, roomSlug} = extractDataFromPrivateRoomId('@/afup/afup2020/1floor');
        expect(organizationSlug).toBe('afup');
        expect(worldSlug).toBe('afup2020');
        expect(roomSlug).toBe('1floor');
    });
})