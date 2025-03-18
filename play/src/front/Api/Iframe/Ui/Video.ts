import { queryWorkadventure } from "../IframeApiContribution";

export class Video {
    constructor(private id: string) {}

    public async stop() {
        await queryWorkadventure({
            type: "stopVideo",
            data: this.id,
        });
        return;
    }
}
