export interface IframeEvent {
    type: string;
    data: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isIframeEventWrapper = (event: any): event is IframeEvent => typeof event.type === 'string';
