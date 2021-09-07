export class WAError extends Error {
    private _title: string;
    private _subTitle: string;
    private _details: string;

    constructor(title: string, subTitle: string, details: string) {
        super(title + " - " + subTitle + " - " + details);
        this._title = title;
        this._subTitle = subTitle;
        this._details = details;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, WAError.prototype);
    }

    get title(): string {
        return this._title;
    }

    get subTitle(): string {
        return this._subTitle;
    }

    get details(): string {
        return this._details;
    }
}
