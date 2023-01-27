export class FileNotFoundError extends Error {
    constructor(message: string, config?: { cause?: Error }) {
        super(message, config);
        this.name = "FileNotFoundError";
    }
}
