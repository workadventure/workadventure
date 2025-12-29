export class ScriptLoadedError extends Error {
    constructor(scriptUrl: string, public readonly retry: () => Promise<void>, cause: Error) {
        super(`Error loading script: ${scriptUrl}`, { cause });
        this.name = "ScriptLoadedError";
    }
}
