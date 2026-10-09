import path from "path";
import { z } from "zod";
import type { FileSystemInterface } from "../Upload/FileSystemInterface";
import { PATH_PREFIX } from "../Enum/EnvironmentVariable";
import { decodeStoragePath, mapPathUsingDomain } from "./PathMapper";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

export const WHITEBOARD_FILE_MAX_BYTES = 4 * 1024 * 1024;

// The images Excalidraw lets people paste, by MIME type, and the extension they are stored under.
export const WHITEBOARD_FILE_TYPES: Readonly<Record<string, string>> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
};

const StoredScene = z.object({ elements: z.array(z.unknown()) });
const ImageElement = z.object({ type: z.literal("image"), fileId: z.string() });

/**
 * Where the whiteboard of an area property is stored: under "private/", which the map-storage never serves
 * without a token (see index.ts), in a folder named after the map:
 *   private/whiteboards/<map path without .wam>/<areaId>/<propertyId>.excalidraw  (the scene)
 *   private/whiteboards/<map path without .wam>/<areaId>/<propertyId>/<fileId>.<ext>  (its images)
 */
export class WhiteboardLocation {
    public readonly scenePath: string;
    public readonly filesDirectory: string;

    private constructor(directory: string) {
        this.scenePath = directory + ".excalidraw";
        this.filesDirectory = directory + "/";
    }

    public static fromWamUrl(wamUrl: URL, areaId: string, propertyId: string): WhiteboardLocation {
        if (!ID.test(areaId) || !ID.test(propertyId)) {
            throw new Error("Invalid whiteboard id");
        }
        return new WhiteboardLocation(
            mapPathUsingDomain(`${WhiteboardLocation.mapRoot(wamUrl)}/${areaId}/${propertyId}`, wamUrl.hostname),
        );
    }

    /** The folder holding every whiteboard of a map. */
    public static mapDirectory(wamUrl: URL): string {
        return mapPathUsingDomain(WhiteboardLocation.mapRoot(wamUrl), wamUrl.hostname);
    }

    private static mapRoot(wamUrl: URL): string {
        let mapPath = decodeStoragePath(wamUrl.pathname);
        if (PATH_PREFIX && mapPath.startsWith(PATH_PREFIX)) {
            mapPath = mapPath.substring(PATH_PREFIX.length);
        }
        if (!mapPath.endsWith(".wam")) {
            throw new Error("A whiteboard belongs to a .wam map");
        }
        return "/private/whiteboards/" + mapPath.replace(/^\/+/, "").replace(/\.wam$/, "");
    }

    public filePath(fileId: string, extension: string): string {
        if (!ID.test(fileId)) {
            throw new Error("Invalid whiteboard file id");
        }
        return `${this.filesDirectory}${fileId}.${extension}`;
    }
}

export class WhiteboardStorageService {
    constructor(private readonly fileSystem: FileSystemInterface) {}

    /** The stored elements, as a JSON array ("[]" for a board that was never saved). */
    public async load(location: WhiteboardLocation): Promise<string> {
        if (!(await this.fileSystem.exist(location.scenePath))) {
            return "[]";
        }
        const scene = StoredScene.parse(JSON.parse(await this.fileSystem.readFileAsString(location.scenePath)));
        return JSON.stringify(scene.elements);
    }

    /**
     * Writes the scene as a regular .excalidraw file (it opens in excalidraw.com as is, without its images),
     * then deletes the images no element refers to anymore.
     */
    public async save(location: WhiteboardLocation, elementsJson: string): Promise<void> {
        const elements = z.array(z.unknown()).parse(JSON.parse(elementsJson));
        await this.fileSystem.writeStringAsFile(
            location.scenePath,
            JSON.stringify({
                type: "excalidraw",
                version: 2,
                source: "WorkAdventure",
                elements,
                appState: {},
                files: {},
            }),
        );

        const usedFileIds = new Set<string>();
        for (const element of elements) {
            const image = ImageElement.safeParse(element);
            if (image.success) {
                usedFileIds.add(image.data.fileId);
            }
        }
        let storedFiles: string[];
        try {
            storedFiles = await this.fileSystem.listFiles(location.filesDirectory);
        } catch {
            return; // No image was ever stored for this board.
        }
        await Promise.all(
            storedFiles
                .filter((file) => !usedFileIds.has(path.parse(file).name))
                .map((file) => this.fileSystem.deleteFiles(location.filesDirectory + file)),
        );
    }

    public async delete(location: WhiteboardLocation): Promise<void> {
        await this.fileSystem.deleteFiles(location.scenePath);
        await this.fileSystem.deleteFiles(location.filesDirectory);
    }
}
