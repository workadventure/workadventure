import type { WokaList } from "../../messages/JsonMessages/PlayerTextures";

export interface WokaServiceInterface {
    /**
     * Returns the list of all available Wokas for the current user.
     */
    getWokaList(roomId: string, token: string): Promise<WokaList | undefined>;
}
