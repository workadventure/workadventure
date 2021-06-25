import {Subject} from "rxjs";

interface EmoteEvent {
    userId: number,
    emoteName: string,
}

class EmoteEventStream {

    private _stream:Subject<EmoteEvent> = new Subject();
    public stream = this._stream.asObservable();


    fire(userId: number, emoteName:string) {
        this._stream.next({userId, emoteName});
    }
}

export const emoteEventStream = new EmoteEventStream();