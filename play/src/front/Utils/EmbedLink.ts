import { MediaLinkManager } from "@workadventure/shared-utils";
import { gameManager } from "../Phaser/Game/GameManager";

export function getEmbedLink(url: string): Promise<string> {
    const mediaLinkManager = new MediaLinkManager(url);
    const applicationManager = gameManager.getCurrentGameScene().applicationManager;
    return mediaLinkManager.getEmbedLink({
        klaxoonId: applicationManager.klaxoonToolClientId,
        excalidrawDomains: applicationManager.excalidrawToolDomains,
    });
}
