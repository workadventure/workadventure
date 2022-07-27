import { Command } from "../Command";
import { ITiledMapRectangleObject } from "../../types";

export interface UpdateAreaCommandPayload {
    areaPreview: AreaPreview;
    config: ITiledMapRectangleObject;
}

export class UpdateAreaCommand extends Command {
    private areaPreview: AreaPreview;
    private oldConfig: ITiledMapRectangleObject;
    private newConfig: ITiledMapRectangleObject;

    constructor(payload: UpdateAreaCommandPayload) {
        super();
        this.areaPreview = payload.areaPreview;
        this.newConfig = { ...payload.config };
        this.oldConfig = { ...this.areaPreview.getConfig() };
    }

    public execute(): void {
        this.areaPreview.updateArea(this.newConfig);
    }

    public undo(): void {
        this.areaPreview.updateArea(this.oldConfig);
    }
}
