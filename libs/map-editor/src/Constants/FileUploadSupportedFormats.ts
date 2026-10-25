import { UploadedFileKind } from "@workadventure/messages";

export const FILE_UPLOAD_SUPPORTED_FORMATS_FRONT =
    "application/pdf,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml";

export type UploadableFileKind = Exclude<UploadedFileKind, UploadedFileKind.UNRECOGNIZED>;

interface UploadedFileFormat {
    /** The map-storage folder the file goes to. */
    folder: string;
    /** The extensions map-storage accepts. */
    extensions: RegExp;
    /** The formats the front offers, as in the `accept` attribute of a file input. */
    accept: string;
}

/**
 * "Open file" documents are private (served with a token that honors the area's read restrictions)
 * while "play audio" sounds are public map assets, like tilesets.
 */
export const UPLOADED_FILE_FORMATS: Record<UploadableFileKind, UploadedFileFormat> = {
    [UploadedFileKind.Document]: {
        folder: "private/files",
        extensions: /\.(pdf|jpg|jpeg|png|gif|webp|bmp|svg)$/i,
        accept: FILE_UPLOAD_SUPPORTED_FORMATS_FRONT,
    },
    [UploadedFileKind.Sound]: {
        folder: "assets/sounds",
        extensions: /\.(mp3|ogg|wav|m4a|flac)$/i,
        accept: ".mp3,.ogg,.wav,.m4a,.flac",
    },
};

/** Undefined for a kind this version does not know, which a client could send. */
export function getUploadedFileFormat(kind: UploadedFileKind): UploadedFileFormat | undefined {
    return kind === UploadedFileKind.UNRECOGNIZED ? undefined : UPLOADED_FILE_FORMATS[kind];
}
