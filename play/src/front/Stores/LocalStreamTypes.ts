export type LocalStreamStoreValue = StreamSuccessValue | StreamErrorValue;

export interface StreamSuccessValue {
    type: "success";
    stream: MediaStream | undefined;
}

export interface StreamErrorValue {
    type: "error";
    error: Error;
}
