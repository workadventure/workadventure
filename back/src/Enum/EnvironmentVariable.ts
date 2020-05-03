const SECRET_KEY = process.env.SECRET_KEY || "THECODINGMACHINE_SECRET_KEY";
const ROOM = process.env.ROOM || "THECODINGMACHINE";
const MINIMUM_DISTANCE = process.env.MINIMUM_DISTANCE ? Number(process.env.MINIMUM_DISTANCE) : 160;
const GROUP_RADIUS = process.env.GROUP_RADIUS ? Number(process.env.GROUP_RADIUS) : 128;

export {
    SECRET_KEY,
    ROOM,
    MINIMUM_DISTANCE,
    GROUP_RADIUS
}
