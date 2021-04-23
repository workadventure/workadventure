const DEBUG_MODE: boolean = process.env.DEBUG_MODE == "true";
const START_ROOM_URL : string = process.env.START_ROOM_URL || '/_/global/maps.workadventure.localhost/Floor0/floor0.json';
// For compatibility reasons with older versions, API_URL is the old host name of PUSHER_URL
const PUSHER_URL = process.env.PUSHER_URL || (process.env.API_URL ? '//'+process.env.API_URL : "//pusher.workadventure.localhost");
const UPLOADER_URL = process.env.UPLOADER_URL || '//uploader.workadventure.localhost';
const ADMIN_URL = process.env.ADMIN_URL || "//workadventure.localhost";
const STUN_SERVER: string = process.env.STUN_SERVER || "stun:stun.l.google.com:19302";
const TURN_SERVER: string = process.env.TURN_SERVER || "";
const TURN_USER: string = process.env.TURN_USER || '';
const TURN_PASSWORD: string = process.env.TURN_PASSWORD || '';
const JITSI_URL : string|undefined = (process.env.JITSI_URL === '') ? undefined : process.env.JITSI_URL;
const JITSI_PRIVATE_MODE : boolean = process.env.JITSI_PRIVATE_MODE == "true";
const RESOLUTION = 2;
const ZOOM_LEVEL = 1/*3/4*/;
const POSITION_DELAY = 200; // Wait 200ms between sending position events
const MAX_EXTRAPOLATION_TIME = 100; // Extrapolate a maximum of 250ms if no new movement is sent by the player
export const MAX_USERNAME_LENGTH = parseInt(process.env.MAX_USERNAME_LENGTH || '') || 8;
export const MAX_PER_GROUP = parseInt(process.env.MAX_PER_GROUP || '4');

export const isMobile = ():boolean => ( ( window.innerWidth <= 800 ) || ( window.innerHeight <= 600 ) );

export {
    DEBUG_MODE,
    START_ROOM_URL,
    PUSHER_URL,
    UPLOADER_URL,
    ADMIN_URL,
    RESOLUTION,
    ZOOM_LEVEL,
    POSITION_DELAY,
    MAX_EXTRAPOLATION_TIME,
    STUN_SERVER,
    TURN_SERVER,
    TURN_USER,
    TURN_PASSWORD,
    JITSI_URL,
    JITSI_PRIVATE_MODE
}
