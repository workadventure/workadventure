import type {PointInterface} from "../../Connexion/ConnexionModels";
import type {BodyResourceDescriptionInterface} from "../Entity/PlayerTextures";

export interface AddPlayerInterface {
    userId: number;
    name: string;
    characterLayers: BodyResourceDescriptionInterface[];
    position: PointInterface;
    companion: string|null;
}
