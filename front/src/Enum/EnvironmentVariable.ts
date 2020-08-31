const DEBUG_MODE: boolean = process.env.DEBUG_MODE == "true";
const API_URL = (typeof(window) !== 'undefined' ? window.location.protocol : 'http:') + '//' + (process.env.API_URL || "api.workadventure.localhost");
const JITSI_URL : string|undefined = (process.env.JITSI_URL === '') ? undefined : process.env.JITSI_URL;
const RESOLUTION = 3;
const ZOOM_LEVEL = 1/*3/4*/;
const POSITION_DELAY = 200; // Wait 200ms between sending position events
const MAX_EXTRAPOLATION_TIME = 250; // Extrapolate a maximum of 250ms if no new movement is sent by the player

export {
    DEBUG_MODE,
    API_URL,
    RESOLUTION,
    ZOOM_LEVEL,
    POSITION_DELAY,
    MAX_EXTRAPOLATION_TIME,
    JITSI_URL
}
