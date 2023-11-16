import { TrackWrapper } from "../Common/TrackWrapper";

export class TeamsTrackWrapper implements TrackWrapper {
    get uniqueId(): string {
        return "todo";
    }
}
