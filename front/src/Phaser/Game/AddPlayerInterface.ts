import {PointInterface} from "../../Connexion/ConnexionModels";
import {BodyResourceDescriptionInterface} from "../Entity/PlayerTextures";

export interface AddPlayerInterface {
    userId: number;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    position: PointInterface;
    companion: string|null;
}
