const DEBUG_MODE: boolean = process.env.DEBUG_MODE as any === true;
const API_URL = process.env.API_URL || "http://api.workadventure.localhost";
const RESOLUTION = 3;
const ZOOM_LEVEL = 1/*3/4*/;
const POSITION_DELAY = 200; // Wait 200ms between sending position events

export {
    DEBUG_MODE,
    API_URL,
    RESOLUTION,
    ZOOM_LEVEL,
    POSITION_DELAY
}
