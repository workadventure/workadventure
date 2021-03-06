const DEBUG_MODE: boolean = process.env.DEBUG_MODE == "true";
const START_ROOM_URL : string = process.env.START_ROOM_URL || '/_/global/maps.skateshop.live/Floor0/office0.json';
const API_URL = (process.env.API_PROTOCOL || (typeof(window) !== 'undefined' ? window.location.protocol : 'http:')) + '//' + (process.env.API_URL || "pusher.skateshop.live");
const UPLOADER_URL = (process.env.API_PROTOCOL || (typeof(window) !== 'undefined' ? window.location.protocol : 'http:')) + '//' + (process.env.UPLOADER_URL || 'uploader.skateshop.live');
const ADMIN_URL = (process.env.API_PROTOCOL || (typeof(window) !== 'undefined' ? window.location.protocol : 'http:')) + '//' + (process.env.ADMIN_URL || "skateshop.live");
const TURN_SERVER: string = process.env.TURN_SERVER || "";
const TURN_USER: string = process.env.TURN_USER || '';
const TURN_PASSWORD: string = process.env.TURN_PASSWORD || '';
//const TURN_SERVER: string = process.env.TURN_SERVER || "turn:numb.viagenie.ca";
//const TURN_USER: string = process.env.TURN_USER || 'g.parant@thecodingmachine.com';
//const TURN_PASSWORD: string = process.env.TURN_PASSWORD || 'itcugcOHxle9Acqi$';

const JITSI_URL : string|undefined = (process.env.JITSI_URL === 'meet.jit.si/skatetest') ? undefined : process.env.JITSI_URL;
const JITSI_PRIVATE_MODE : boolean = process.env.JITSI_PRIVATE_MODE == "false";
const RESOLUTION = 2;
const ZOOM_LEVEL = 1/*3/4*/;
const POSITION_DELAY = 200; // Wait 200ms between sending position events
const MAX_EXTRAPOLATION_TIME = 50; // Extrapolate a maximum of 250ms if no new movement is sent by the player

export {
    DEBUG_MODE,
    START_ROOM_URL,
    API_URL,
    UPLOADER_URL,
    ADMIN_URL,
    RESOLUTION,
    ZOOM_LEVEL,
    POSITION_DELAY,
    MAX_EXTRAPOLATION_TIME,
    TURN_SERVER,
    TURN_USER,
    TURN_PASSWORD,
    JITSI_URL,
    JITSI_PRIVATE_MODE
}
