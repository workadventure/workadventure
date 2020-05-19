import {PointInterface} from "../../Connexion";

export interface AddPlayerInterface {
    userId: string;
    name: string;
    character: string;
    position: PointInterface;
}
