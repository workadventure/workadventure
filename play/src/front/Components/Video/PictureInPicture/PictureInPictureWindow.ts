// create interface for window with documentPictureInPicture
declare global {
    interface Window {
        documentPictureInPicture: {
            requestWindow: (options: {
                preferInitialWindowPlacement: boolean;
                height: string;
                width: string;
            }) => Promise<Window>;
        };
    }
}

export {};
