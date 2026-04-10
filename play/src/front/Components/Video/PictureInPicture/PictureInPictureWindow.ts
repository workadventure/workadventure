export interface DocumentPictureInPictureEvent extends Event {
    readonly window: Window;
}

interface DocumentPictureInPicture extends EventTarget {
    readonly window?: Window;
    requestWindow: (options: {
        preferInitialWindowPlacement: boolean;
        height: string;
        width: string;
    }) => Promise<Window>;
    addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: "enter",
        listener: (event: DocumentPictureInPictureEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions
    ): void;
    removeEventListener(
        type: "enter",
        listener: (event: DocumentPictureInPictureEvent) => void,
        options?: boolean | EventListenerOptions
    ): void;
}

// create interface for window with documentPictureInPicture
declare global {
    interface Window {
        documentPictureInPicture: DocumentPictureInPicture;
    }
}

export {};
