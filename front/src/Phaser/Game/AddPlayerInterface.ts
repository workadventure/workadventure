import {PointInterface} from "../../Connection";

export interface AddPlayerInterface {
    userId: string;
    name: string;
    character: string;
    position: PointInterface;
}
