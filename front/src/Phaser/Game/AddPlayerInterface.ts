import {PointInterface} from "../../Connexion/ConnexionModels";

export interface AddPlayerInterface {
    userId: number;
    name: string;
    characterLayers: string[];
    position: PointInterface;
}
