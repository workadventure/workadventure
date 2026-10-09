import excalidrawIcon from "../../Components/images/applications/icon_excalidraw.svg";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

/**
 * The collaborative whiteboard of an area, drawn by Excalidraw right inside WorkAdventure (no iframe).
 * The URL only identifies the board (in analytics); there is nothing to load from it.
 */
export class WhiteboardCoWebsite extends SimpleCoWebsite {
    constructor(
        url: URL,
        public readonly areaId: string,
        public readonly propertyId: string,
        private readonly title: string,
        widthPercent?: number,
    ) {
        super(url, false, undefined, widthPercent, true, true);
        this.id = "whiteboard-" + this.id;
    }

    public getTitle(): string {
        return this.title;
    }

    public getIcon(): string {
        return excalidrawIcon;
    }
}
