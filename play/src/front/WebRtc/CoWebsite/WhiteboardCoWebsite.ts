import excalidrawIcon from "../../Components/images/applications/icon_excalidraw.svg";
import type { WhiteboardBoard } from "../../Stores/WhiteboardStore";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

/**
 * A whiteboard in its panel beside the map (see WhiteboardStore). Not closable from the co-website bar: the
 * board's own header closes it, or puts it on stage.
 */
export class WhiteboardCoWebsite extends SimpleCoWebsite {
    constructor(
        url: URL,
        public readonly board: WhiteboardBoard,
    ) {
        super(url, false, undefined, undefined, false, true);
        this.id = "whiteboard-" + this.id;
    }

    public getTitle(): string {
        return this.board.title;
    }

    public getIcon(): string {
        return excalidrawIcon;
    }
}
