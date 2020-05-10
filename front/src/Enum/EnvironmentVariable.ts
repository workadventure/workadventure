const DEBUG_MODE: boolean = process.env.DEBUG_MODE as any === true;
const API_URL = process.env.API_URL || "http://api.workadventure.localhost";
const ROOM = [process.env.ROOM || "THECODINGMACHINE"];
const RESOLUTION = 3;
const ZOOM_LEVEL = 1/*3/4*/;
const MAP_FILE_URL = `${API_URL}/map/files`;

export {
    DEBUG_MODE,
    API_URL,
    RESOLUTION,
    ZOOM_LEVEL,
    ROOM,
    MAP_FILE_URL
}
