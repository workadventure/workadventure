import {Subject} from "rxjs";

class WorldFullMessageStream {
    
    private _stream:Subject<string|null> = new Subject<string|null>();
    public stream = this._stream.asObservable();


    onMessage(message? :string) {
        this._stream.next(message);
    }
}

export const worldFullMessageStream = new WorldFullMessageStream();