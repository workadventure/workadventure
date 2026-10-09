import type { WhiteboardStorageKey } from "@workadventure/messages";
import { asError } from "catch-unknown";
import { getMapStorageClient } from "../../Services/MapStorageClient";
import { MAX_ELEMENTS_PER_BOARD, parseWhiteboardElements } from "./WhiteboardScene";
import type { WhiteboardElement } from "./WhiteboardScene";

/**
 * Where the boards are kept between two sessions: next to their map, in the map-storage.
 */
export interface WhiteboardPersistence {
    load(key: WhiteboardStorageKey): Promise<WhiteboardElement[]>;
    save(key: WhiteboardStorageKey, elements: WhiteboardElement[]): Promise<void>;
}

export const mapStorageWhiteboardPersistence: WhiteboardPersistence = {
    load(key) {
        return new Promise((resolve, reject) => {
            getMapStorageClient().loadWhiteboard(key, (error, scene) => {
                if (error) {
                    reject(error);
                    return;
                }
                try {
                    resolve(parseWhiteboardElements(scene.elementsJson, MAX_ELEMENTS_PER_BOARD));
                } catch (e) {
                    reject(asError(e));
                }
            });
        });
    },
    save(key, elements) {
        return new Promise((resolve, reject) => {
            getMapStorageClient().saveWhiteboard({ key, elementsJson: JSON.stringify(elements) }, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    },
};
