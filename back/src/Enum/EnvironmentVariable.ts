const SECRET_KEY = process.env.SECRET_KEY || "THECODINGMACHINE_SECRET_KEY";
const URL_ROOM_STARTED = "/Floor0/floor0.json";
const MINIMUM_DISTANCE = process.env.MINIMUM_DISTANCE ? Number(process.env.MINIMUM_DISTANCE) : 64;
const GROUP_RADIUS = process.env.GROUP_RADIUS ? Number(process.env.GROUP_RADIUS) : 48;

export {
    SECRET_KEY,
    URL_ROOM_STARTED,
    MINIMUM_DISTANCE,
    GROUP_RADIUS
}
