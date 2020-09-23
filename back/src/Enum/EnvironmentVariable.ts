const SECRET_KEY = process.env.SECRET_KEY || "THECODINGMACHINE_SECRET_KEY";
const URL_ROOM_STARTED = "/Floor0/floor0.json";
const MINIMUM_DISTANCE = process.env.MINIMUM_DISTANCE ? Number(process.env.MINIMUM_DISTANCE) : 64;
const GROUP_RADIUS = process.env.GROUP_RADIUS ? Number(process.env.GROUP_RADIUS) : 48;
const ALLOW_ARTILLERY = process.env.ALLOW_ARTILLERY ? process.env.ALLOW_ARTILLERY == 'true' : false;
const ADMIN_API_URL = process.env.ADMIN_API_URL || null;
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || null;

export {
    SECRET_KEY,
    URL_ROOM_STARTED,
    MINIMUM_DISTANCE,
    ADMIN_API_URL,
    ADMIN_API_TOKEN,
    GROUP_RADIUS,
    ALLOW_ARTILLERY,
}