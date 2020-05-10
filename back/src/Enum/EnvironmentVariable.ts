const SECRET_KEY = process.env.SECRET_KEY || "THECODINGMACHINE_SECRET_KEY";
const ROOM_STARTED = "floor0";
const URL_ROOM_STARTED = "/map/files/Floor0";
const ROOMS = [
    {key: "floor0", url: "/map/files/Floor0"},
    {key: "floor1", url: "/map/files/Floor1"},
]
const MINIMUM_DISTANCE = process.env.MINIMUM_DISTANCE ? Number(process.env.MINIMUM_DISTANCE) : 64;
const GROUP_RADIUS = process.env.GROUP_RADIUS ? Number(process.env.GROUP_RADIUS) : 48;

export {
    SECRET_KEY,
    ROOM_STARTED,
    URL_ROOM_STARTED,
    ROOMS,
    MINIMUM_DISTANCE,
    GROUP_RADIUS
}
