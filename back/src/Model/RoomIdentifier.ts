//helper functions to parse room IDs

export const isRoomAnonymous = (roomID: string): boolean => {
    if (roomID.startsWith("_/")) {
        return true;
    } else if (roomID.startsWith("@/")) {
        return false;
    } else {
        throw new Error("Incorrect room ID: " + roomID);
    }
};

export const extractRoomSlugPublicRoomId = (roomId: string): string => {
    const idParts = roomId.split("/");
    if (idParts.length < 3) throw new Error("Incorrect roomId: " + roomId);
    return idParts.slice(2).join("/");
};
export interface extractDataFromPrivateRoomIdResponse {
    organizationSlug: string;
    worldSlug: string;
    roomSlug: string;
}
export const extractDataFromPrivateRoomId = (roomId: string): extractDataFromPrivateRoomIdResponse => {
    const idParts = roomId.split("/");
    if (idParts.length < 4) throw new Error("Incorrect roomId: " + roomId);
    const organizationSlug = idParts[1];
    const worldSlug = idParts[2];
    const roomSlug = idParts[3];
    return { organizationSlug, worldSlug, roomSlug };
};
