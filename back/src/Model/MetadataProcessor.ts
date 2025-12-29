import type { Space } from "./Space";

type MetadataProcessorFunction = (value: unknown, senderId: string, space: Space) => Promise<unknown>;
export class MetadataProcessor {
    private metadataProcessors = new Map<string, MetadataProcessorFunction>();

    public registerMetadataProcessor(key: string, processor: MetadataProcessorFunction): void {
        this.metadataProcessors.set(key, processor);
    }

    public async processMetadata(key: string, value: unknown, senderId: string, space: Space): Promise<unknown> {
        const processor = this.metadataProcessors.get(key);
        if (processor) {
            return await processor(value, senderId, space);
        }
        return value;
    }
}
