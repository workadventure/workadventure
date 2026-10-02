declare interface HTMLMediaElement {
    setSinkId?: (sinkId: string) => Promise<void>;
}

// Audio Output Devices API on AudioContext (Chrome 110+). Absent from the TypeScript DOM lib, and
// optional because Firefox and Safari do not implement it.
declare interface AudioContext {
    setSinkId?: (sinkId: string) => Promise<void>;
}
