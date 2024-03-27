import { Observable } from "rxjs";
import {
    AddSpaceUserMessage,
    UpdateSpaceUserMessage,
    RemoveSpaceUserMessage,
    UpdateSpaceMetadataMessage,
} from "@workadventure/messages";
export interface SpaceStreams {
    addSpaceUserMessage: Observable<AddSpaceUserMessage>;
    updateSpaceUserMessage: Observable<UpdateSpaceUserMessage>;
    removeSpaceUserMessage: Observable<RemoveSpaceUserMessage>;
    updateSpaceMetadataMessage: Observable<UpdateSpaceMetadataMessage>;
}
