export const play_url = process.env.PLAY_URL ?? 'http://play.workadventure.localhost';
export const map_storage_url = (process.env.MAP_STORAGE_PROTOCOL ?? "http") + "://john.doe:password@" + (process.env.MAP_STORAGE_ENDPOINT ?? 'map-storage.workadventure.localhost');
