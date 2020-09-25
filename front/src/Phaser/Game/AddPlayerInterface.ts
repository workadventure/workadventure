import {PointInterface} from "../../Connection";

export interface AddPlayerInterface {
    userId: number;
    name: string;
    characterLayers: string[];
    position: PointInterface;
}
