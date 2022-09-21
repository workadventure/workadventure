import type {CompanionServiceList} from "./CompanionServiceList";
import type {CompanionList} from "../../messages/JsonMessages/CompanionTextures";

const defaultCompanionList: CompanionList = [
    {name: "dog1", img: "resources/characters/pipoya/Dog 01-1.png", behaviour: "dog"},
    {name: "dog2", img: "resources/characters/pipoya/Dog 01-2.png", behaviour: "dog"},
    {name: "dog3", img: "resources/characters/pipoya/Dog 01-3.png", behaviour: "dog"},
    {name: "cat1", img: "resources/characters/pipoya/Cat 01-1.png", behaviour: "cat"},
    {name: "cat2", img: "resources/characters/pipoya/Cat 01-2.png", behaviour: "cat"},
    {name: "cat3", img: "resources/characters/pipoya/Cat 01-3.png", behaviour: "cat"},
];

/**
 * Companion Service list that the default list of companions
 */
export class LocalCompanionSevice implements CompanionServiceList {
    getCompanionList(roomUrl: string, token: string): Promise<CompanionList | undefined> {
        return Promise.resolve(defaultCompanionList);
    }
}
