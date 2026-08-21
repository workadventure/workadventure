import { ConnectionCheck, CheckStatus, type CheckInfo } from "livekit-client";
import { Subject, type Observable } from "rxjs";

export enum LivekitConnectionStatus {
    Success = "Success",
    Warning = "Warning",
    Critical = "Critical",
}

export interface LivekitCheckSummary {
    status: LivekitConnectionStatus;
    failedChecks: string[];
}

/**
 * The subset of LiveKit connection checks we rely on to decide what to tell the user.
 * We keep our own labels instead of using `CheckInfo.name`, which is the check's runtime class
 * name (`constructor.name`) and gets mangled by the production minifier.
 */
export interface LivekitCheckResults {
    websocket: CheckInfo;
    webRTC: CheckInfo;
    turn: CheckInfo;
    publishAudio: CheckInfo;
    publishVideo: CheckInfo;
}

/**
 * Turns the raw LiveKit check results into a user-facing severity.
 * Pure function (no I/O) so it can be unit-tested in isolation.
 * - A failing signaling websocket means the user cannot communicate at all -> Critical.
 * - A degraded media path (webRTC/TURN/publish) only reduces audio/video quality -> Warning.
 */
export function classifyLivekitChecks(results: LivekitCheckResults): LivekitCheckSummary {
    const isFailed = (check: CheckInfo): boolean => check.status === CheckStatus.FAILED;

    const failedChecks = (
        [
            ["websocket", results.websocket],
            ["webRTC", results.webRTC],
            ["turn", results.turn],
            ["publishAudio", results.publishAudio],
            ["publishVideo", results.publishVideo],
        ] as const
    )
        .filter(([, result]) => isFailed(result))
        .map(([label]) => label);

    let status = LivekitConnectionStatus.Success;
    if (isFailed(results.websocket)) {
        status = LivekitConnectionStatus.Critical;
    } else if ([results.webRTC, results.turn, results.publishAudio, results.publishVideo].some(isFailed)) {
        status = LivekitConnectionStatus.Warning;
    }

    return { status, failedChecks };
}

export class LivekitConnectionChecker {
    private _connectionCheck: ConnectionCheck;

    private readonly _statusStream = new Subject<LivekitCheckSummary>();
    public readonly statusStream: Observable<LivekitCheckSummary> = this._statusStream.asObservable();

    constructor(url: string, token: string) {
        this._connectionCheck = new ConnectionCheck(url, token);
    }

    public async runConnectionCheck(): Promise<void> {
        try {
            // Run the checks sequentially: livekit-client's ConnectionCheck shares internal state between
            // checks and each check opens its own connection, so running them in parallel is unreliable.
            // We only run the checks needed to decide the severity shown to the user.
            const websocket = await this._connectionCheck.checkWebsocket();
            const webRTC = await this._connectionCheck.checkWebRTC();
            const turn = await this._connectionCheck.checkTURN();
            const publishAudio = await this._connectionCheck.checkPublishAudio();
            const publishVideo = await this._connectionCheck.checkPublishVideo();

            this._statusStream.next(classifyLivekitChecks({ websocket, webRTC, turn, publishAudio, publishVideo }));
        } catch (e) {
            console.error("Error during global Livekit connection check", e);
            this._statusStream.next({
                status: LivekitConnectionStatus.Critical,
                failedChecks: ["GlobalFailure"],
            });
        }
    }
}
