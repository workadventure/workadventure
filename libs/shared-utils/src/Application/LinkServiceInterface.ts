
export interface LinkServiceInterface {
    isValidLink(url: URL): boolean;

    /**
     * Return true if the link is already embeddable
     */
    isEmbeddableLink(url: URL): boolean;

    /**
     * Returns an embeddable URL from the URL in parameter
     */
    getEmbedUrl(url: URL): Promise<URL>;

    // TODO: add other methods
    // TODO: add other methods
    // TODO: add other methods
    // TODO: add other methods
    // TODO: add other methods
    // getErrorText getDescriptingText getIconUrl ....
}