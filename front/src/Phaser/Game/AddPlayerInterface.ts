import {PointInterface} from "../../Connexion/Connection";

export interface AddPlayerInterface {
    userId: number;
    name: string;
    characterLayers: string[];
    position: PointInterface;
}
