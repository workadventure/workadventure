import { getEmbedLink as getEmbedLinkOf } from "@workadventure/shared-utils";
import { gameManager } from "../Phaser/Game/GameManager";

export function getEmbedLink(url: string): Promise<string> {
    const applicationManager = gameManager.getCurrentGameScene().applicationManager;
    return getEmbedLinkOf(new URL(url), {
        klaxoonId: applicationManager.klaxoonToolClientId,
        excalidrawDomains: applicationManager.excalidrawToolDomains,
    });
}
