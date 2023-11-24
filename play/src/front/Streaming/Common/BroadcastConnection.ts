export interface BroadcastConnection {
    disconnect(...args: unknown[]): Promise<unknown>;
}
