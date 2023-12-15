/**
 * Classes extending this interface can be used to check if files exist.
 */
export interface FileFetcherInterface {
    fileExists(path: string): Promise<boolean>;
}
