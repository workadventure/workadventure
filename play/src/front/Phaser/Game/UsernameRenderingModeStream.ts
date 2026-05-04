import type { Observable } from "rxjs";
import { distinctUntilChanged, map, scan, shareReplay } from "rxjs/operators";
import type { RemotePlayersRepository } from "./RemotePlayersRepository";

const CANVAS_TO_DOM_THRESHOLD = 110;
const DOM_TO_CANVAS_THRESHOLD = 90;

export class UsernameRenderingModeStream {
    public readonly renderingAsDOM$: Observable<boolean>;

    constructor(remotePlayersRepository: RemotePlayersRepository) {
        this.renderingAsDOM$ = remotePlayersRepository.getPlayersCountObservable().pipe(
            map((playersCount) => this.isRenderingAsDOM(playersCount)),
            scan((currentMode, targetMode) => targetMode ?? currentMode, true),
            distinctUntilChanged(),
            shareReplay({ bufferSize: 1, refCount: true })
        );
    }

    private isRenderingAsDOM(playersCount: number): boolean | undefined {
        if (playersCount <= CANVAS_TO_DOM_THRESHOLD) {
            return true;
        } else if (playersCount >= DOM_TO_CANVAS_THRESHOLD) {
            return false;
        }
        return undefined;
    }
}
