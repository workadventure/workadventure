import {Subject} from "rxjs";

class WorldFullWarningStream {

    private _stream:Subject<void> = new Subject();
    public stream = this._stream.asObservable();


    onMessage() {
        this._stream.next();
    }
}

export const worldFullWarningStream = new WorldFullWarningStream();