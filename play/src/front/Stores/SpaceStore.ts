import { SpaceFilterMessage } from "@workadventure/messages";
import * as StoreUtils from "@workadventure/store-utils";


export const spaceStore = new StoreUtils.MapStore<string, SpaceFilterMessage>();
