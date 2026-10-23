const fileUploadSupportedFormatForMapStorage = /\.(pdf|jpg|jpeg|png|gif|webp|bmp|svg)$/i;
export const FILE_UPLOAD_SUPPORTED_FORMATS_FRONT =
    "application/pdf,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml";

const soundUploadSupportedFormat = /\.(mp3|ogg|wav|m4a|flac)$/i;
export const SOUND_UPLOAD_SUPPORTED_FORMATS_FRONT = ".mp3,.ogg,.wav,.m4a,.flac";

/**
 * The map-storage folder an uploaded file goes to, picked from its extension, or undefined if the
 * format is not accepted. "Open file" documents are private (served with a token that honors the
 * area's read restrictions) while "play audio" sounds are public map assets, like tilesets.
 */
export function uploadedFileFolder(fileName: string): "private/files" | "assets/sounds" | undefined {
    if (soundUploadSupportedFormat.test(fileName)) {
        return "assets/sounds";
    }
    if (fileUploadSupportedFormatForMapStorage.test(fileName)) {
        return "private/files";
    }
    return undefined;
}
