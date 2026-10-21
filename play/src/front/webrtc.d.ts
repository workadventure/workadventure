declare interface HTMLMediaElement {
    setSinkId?: (sinkId: string) => Promise<void>;
}

// Audio Output Devices API on AudioContext (Chrome 110+), absent from TypeScript's DOM types. Optional: Firefox and
// Safari do not implement it. sinkId is an object only for a { type: "none" } sink, which we never set.
declare interface AudioContext {
    readonly sinkId?: string | object;
    setSinkId?: (sinkId: string) => Promise<void>;
}
