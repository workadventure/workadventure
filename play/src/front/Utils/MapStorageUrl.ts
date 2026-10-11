import { ENTITIES_FOLDER_PATH_NO_PREFIX, ENTITY_COLLECTION_FILE } from "@workadventure/map-editor";

/**
 * Returns the root of the map-storage, with a trailing slash, whether the prefix (the pathname of
 * PUBLIC_MAP_STORAGE_URL) is undefined, "/", "/map-storage" or "/map-storage/".
 */
export function getMapStorageRootUrl(wamUrl: string, publicMapStoragePrefix: string | undefined): URL {
    let mapStoragePath = publicMapStoragePrefix ?? "";
    if (!mapStoragePath.endsWith("/")) {
        mapStoragePath += "/";
    }
    return new URL(mapStoragePath, wamUrl);
}

export function getCustomEntityCollectionUrl(wamUrl: string, publicMapStoragePrefix: string | undefined): string {
    const mapStorageRootUrl = getMapStorageRootUrl(wamUrl, publicMapStoragePrefix);
    return new URL(`${ENTITIES_FOLDER_PATH_NO_PREFIX}/${ENTITY_COLLECTION_FILE}`, mapStorageRootUrl).toString();
}
