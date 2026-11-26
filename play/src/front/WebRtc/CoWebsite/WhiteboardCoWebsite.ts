import excalidrawIcon from "../../Components/images/applications/icon_excalidraw.svg";
import type { WhiteboardMountOptions } from "../../Whiteboard/WhiteboardApp";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

/**
 * The collaborative whiteboard of an area, drawn by Excalidraw right inside WorkAdventure (no iframe).
 * The URL only identifies the board (in analytics); there is nothing to load from it.
 */
export class WhiteboardCoWebsite extends SimpleCoWebsite {
    constructor(
        url: URL,
        public readonly options: WhiteboardMountOptions,
        private readonly title: string,
    ) {
        super(url, false, undefined, undefined, true, true);
        this.id = "whiteboard-" + this.id;
    }

    public getTitle(): string {
        return this.title;
    }

    public getIcon(): string {
        return excalidrawIcon;
    }
}
