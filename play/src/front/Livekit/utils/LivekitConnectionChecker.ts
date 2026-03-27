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

export class LivekitConnectionChecker {
    private _connectionCheck: ConnectionCheck;

    private readonly _statusStream = new Subject<LivekitCheckSummary>();
    public readonly statusStream: Observable<LivekitCheckSummary> = this._statusStream.asObservable();

    constructor(url: string, token: string) {
        this._connectionCheck = new ConnectionCheck(url, token);
    }

    public async runConnectionCheck(): Promise<void> {
        try {
            const results = await Promise.all([
                this._connectionCheck.checkWebsocket(),
                this._connectionCheck.checkWebRTC(),
                this._connectionCheck.checkTURN(),
                this._connectionCheck.checkPublishAudio(),
                this._connectionCheck.checkPublishVideo(),
                this._connectionCheck.checkConnectionProtocol(),
                this._connectionCheck.checkCloudRegion(),
                this._connectionCheck.checkReconnect(),
            ]);

            
            console.log(">>>>>results", results);

            const failedChecks = results
            .filter((r) => r.status === CheckStatus.FAILED)
            .map((r) => r.name);
            
            console.log(">>>>>failedChecks", failedChecks);

            let status = LivekitConnectionStatus.Success;

            // Priorité aux erreurs critiques
            //TODO : Add Sentry error to see livekit connection issues
            if (failedChecks.includes("WebSocketCheck") /*|| failedChecks.includes("WebRTCCheck")*/) {
                status = LivekitConnectionStatus.Critical;
            } else if (
                failedChecks.some((name) => ["TURNCheck", "PublishAudioCheck", "PublishVideoCheck","WebRTCCheck"].includes(name))
            ) {
                status = LivekitConnectionStatus.Warning;
            }

            this._statusStream.next({
                status,
                failedChecks,
            });
        } catch (e) {
            console.error("Error during global Livekit connection check", e);
            this._statusStream.next({
                status: LivekitConnectionStatus.Critical,
                failedChecks: ["GlobalFailure"],
            });
        }
    }
}
