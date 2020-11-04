const SECRET_KEY = process.env.SECRET_KEY || "THECODINGMACHINE_SECRET_KEY";
const URL_ROOM_STARTED = "/Floor0/floor0.json";
const MINIMUM_DISTANCE = process.env.MINIMUM_DISTANCE ? Number(process.env.MINIMUM_DISTANCE) : 64;
const GROUP_RADIUS = process.env.GROUP_RADIUS ? Number(process.env.GROUP_RADIUS) : 48;
const ALLOW_ARTILLERY = process.env.ALLOW_ARTILLERY ? process.env.ALLOW_ARTILLERY == 'true' : false;
const ADMIN_API_URL = process.env.ADMIN_API_URL || 'http://admin';
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN || 'myapitoken';
const MAX_USERS_PER_ROOM = parseInt(process.env.MAX_USERS_PER_ROOM || '') || 600;
const CPU_OVERHEAT_THRESHOLD = Number(process.env.CPU_OVERHEAT_THRESHOLD) || 80;
const JITSI_URL : string|undefined = (process.env.JITSI_URL === '') ? undefined : process.env.JITSI_URL;
const JITSI_ISS = process.env.JITSI_ISS || '';
const SECRET_JITSI_KEY = process.env.SECRET_JITSI_KEY || '';

export {
    SECRET_KEY,
    URL_ROOM_STARTED,
    MINIMUM_DISTANCE,
    ADMIN_API_URL,
    ADMIN_API_TOKEN,
    MAX_USERS_PER_ROOM,
    GROUP_RADIUS,
    ALLOW_ARTILLERY,
    CPU_OVERHEAT_THRESHOLD,
    JITSI_URL,
    JITSI_ISS,
    SECRET_JITSI_KEY
}
