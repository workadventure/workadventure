import {PointInterface} from "../../Connexion/ConnexionModels";
import {BodyResourceDescriptionInterface} from "../Entity/body_character";

export interface AddPlayerInterface {
    userId: number;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    position: PointInterface;
}
