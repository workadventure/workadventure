import {PointInterface} from "../../Connection";

export interface AddPlayerInterface {
    userId: string;
    name: string;
    characterLayers: string[];
    position: PointInterface;
}
