import { JitsiMeetJSType } from "lib-jitsi-meet/types/hand-crafted/JitsiMeetJS";

declare global {
    interface Window {
        JitsiMeetJS: JitsiMeetJSType;
    }
}
