const DEBUG_MODE: boolean = process.env.DEBUG_MODE == "true";
const API_URL = (new URL(process.env.API_URL || '//pusher.workadventure.localhost', typeof(window) !== 'undefined'? window.location.href : 'https://l')).href.replace(/\/$/, '');
const UPLOADER_URL = (new URL(process.env.UPLOADER_URL || '//uploader.workadventure.localhost', typeof(window) !== 'undefined' ? window.location.href : 'https://l')).href.replace(/\/$/, '');
const ADMIN_URL = (new URL(process.env.ADMIN_URL || '//admin.workadventure.localhost', typeof(window) !== 'undefined' ? window.location.href : 'https://l')).href.replace(/\/$/, '');
const MAPS_URL = (new URL(process.env.MAPS_URL || '//maps.workadventure.localhost', typeof(window) !== 'undefined' ? window.location.href : 'https://l')).href.replace(/\/$/, '');
const START_ROOM_URL : string = process.env.START_ROOM_URL || `/_/global/${MAPS_URL}/Floor0/floor0.json`;
const TURN_SERVER: string = process.env.TURN_SERVER || "turn:numb.viagenie.ca";
const TURN_USER: string = process.env.TURN_USER || 'g.parant@thecodingmachine.com';
const TURN_PASSWORD: string = process.env.TURN_PASSWORD || 'itcugcOHxle9Acqi$';
const JITSI_URL : string|undefined = (process.env.JITSI_URL === '') ? undefined : process.env.JITSI_URL;
const JITSI_PRIVATE_MODE : boolean = process.env.JITSI_PRIVATE_MODE == "true";
const RESOLUTION = 2;
const ZOOM_LEVEL = 1/*3/4*/;
const POSITION_DELAY = 200; // Wait 200ms between sending position events
const MAX_EXTRAPOLATION_TIME = 100; // Extrapolate a maximum of 250ms if no new movement is sent by the player

export {
    DEBUG_MODE,
    START_ROOM_URL,
    API_URL,
    UPLOADER_URL,
    ADMIN_URL,
    MAPS_URL,
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
