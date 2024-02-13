import type { ModifiyWAMMetadataMessage } from "@workadventure/messages";
import { WAMFileFormat } from "../../types";
import { Command } from "../Command";

export class UpdateWAMMetadataCommand extends Command {
    constructor(
        protected wam: WAMFileFormat,
        protected modifiyWAMMetadataMessage: ModifiyWAMMetadataMessage,
        id?: string
    ) {
        super(id);
    }

    execute(): Promise<WAMFileFormat> {
        if (!this.wam.metadata) {
            this.wam.metadata = {};
        }
        this.wam.metadata.name = this.modifiyWAMMetadataMessage.name;
        this.wam.metadata.description = this.modifiyWAMMetadataMessage.description;
        this.wam.metadata.thumbnail = this.modifiyWAMMetadataMessage.thumbnail;
        this.wam.metadata.copyright = this.modifiyWAMMetadataMessage.copyright;

        if (!this.wam.vendor) {
            this.wam.vendor = {
                tags: Array<string>(),
            };
        }
        (this.wam.vendor as { tags: Array<string> }).tags =
            this.modifiyWAMMetadataMessage.tags && this.modifiyWAMMetadataMessage.tags.length > 0
                ? this.modifiyWAMMetadataMessage.tags.split(",")
                : [];
        return Promise.resolve(this.wam);
    }
}
