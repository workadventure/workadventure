export interface BackgroundConfig {
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
}

export type BackgroundMode = "none" | "blur" | "image" | "video";
