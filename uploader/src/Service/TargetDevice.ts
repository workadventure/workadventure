export interface TargetDevice {
    copyFromLink(link: string): void;

    copyFromBuffer(buffer: Buffer | undefined | null): void;
}
