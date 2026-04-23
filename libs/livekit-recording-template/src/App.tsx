import { RecordingRoomTemplate } from "./components/RecordingRoomTemplate";
import { DevMosaicTester } from "./dev/DevMosaicTester";
import { DevSpeakerTester } from "./dev/DevSpeakerTester";

export default function App(): JSX.Element {
    if (import.meta.env.DEV && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.has("devMosaic")) {
            return <DevMosaicTester />;
        }
        if (params.has("devSpeaker")) {
            return <DevSpeakerTester />;
        }
    }
    return <RecordingRoomTemplate />;
}
