export class WAError extends Error {
    private _type: string;
    private _code: string;
    private _title: string;
    private _subtitle: string;
    private _details: string;
    private _timeToRetry: number;
    private _canRetryManual: boolean;
    private _urlToRedirect: string;
    private _buttonTitle: string;

    constructor(
        type: string,
        code: string,
        title: string,
        subtitle: string,
        details: string,
        timeToRetry: number,
        canRetryManual: boolean,
        urlToRedirect: string,
        buttonTitle: string
    ) {
        super(title + " - " + subtitle + " - " + details);

        this._type = type;
        this._code = code;
        this._title = title;
        this._subtitle = subtitle;
        this._details = details;
        this._timeToRetry = timeToRetry;
        this._canRetryManual = canRetryManual;
        this._urlToRedirect = urlToRedirect;
        this._buttonTitle = buttonTitle;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, WAError.prototype);
    }

    get type(): string {
        return this._type;
    }
    get code(): string {
        return this._code;
    }
    get title(): string {
        return this._title;
    }
    get subtitle(): string {
        return this._subtitle;
    }
    get details(): string {
        return this._details;
    }
    get timeToRetry(): number {
        return this._timeToRetry;
    }
    get buttonTitle(): string {
        return this._buttonTitle;
    }
    get urlToRedirect(): string {
        return this._urlToRedirect;
    }
    get canRetryManual(): boolean {
        return this._canRetryManual;
    }
}
