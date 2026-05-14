/**
 * These declarations tell TypeScript that we allow import of images, e.g.
 * ```
 <script lang='ts'>
 import successkid from 'images/successkid.jpg';
 </script>
 <img src="{successkid}">
 ```
 */
declare module "*.gif" {
    const value: string;
    export = value;
}

declare module "*.jpg" {
    const value: string;
    export = value;
}

declare module "*.jpeg" {
    const value: string;
    export = value;
}

declare module "*.png" {
    const value: string;
    export = value;
}

declare module "*.svg" {
    const value: string;
    export = value;
}

declare module "*.webp" {
    const value: string;
    export = value;
}

declare module "@workadventure/noise-suppression/audio-worklet" {
    export * from "@workadventure/noise-suppression/dist/audio-worklet.js";
}
