import { WokaDetailsResult, WokaList } from "../Enum/PlayerTextures";

export interface WokaServiceInterface {
    /**
     * Returns the list of all available Wokas for the current user.
     */
    getWokaList(token: string): Promise<WokaList | undefined>;

    /**
     * Returns the URL of all the images for the given texture ids.
     *
     * Key: texture id
     * Value: URL
     *
     * If one of the textures cannot be found, undefined is returned (and the user should be redirected to Woka choice page!)
     */
    //fetchWokaDetails(textureIds: string[]): Promise<WokaDetailsResult | undefined>;
}
