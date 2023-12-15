import { shortHash } from "../String/shortHash";

export const slugify = (...args: (string | number)[]): string => {
    const value = args.join(" ");

    return value
        .normalize("NFD") // split an accented letter in the base letter and the accent
        .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-_ ]/g, "") // remove all chars not letters, numbers, dash, underscores and spaces (to be replaced)
        .replace(/\s+/g, "-"); // separator
};

function slugifyJitsiRoomName(roomName: string, roomId: string, noPrefix = false): string {
    return slugify((noPrefix ? "" : shortHash(roomId) + "-") + roomName);
}

function getJitsiRoomId(roomId: string) {
    return shortHash(roomId);
}

export { slugifyJitsiRoomName, getJitsiRoomId };
