import type { Space } from "./Space";

type MetadataProcessorFunction = (value: unknown, senderId: string, space: Space) => Promise<unknown>;
type MetadataPrefixProcessorFunction = (
    key: string,
    value: unknown,
    senderId: string,
    space: Space,
) => Promise<unknown>;
export class MetadataProcessor {
    private metadataProcessors = new Map<string, MetadataProcessorFunction>();
    private metadataPrefixProcessors = new Map<string, MetadataPrefixProcessorFunction>();

    public registerMetadataProcessor(key: string, processor: MetadataProcessorFunction): void {
        this.metadataProcessors.set(key, processor);
    }

    public registerMetadataPrefixProcessor(keyPrefix: string, processor: MetadataPrefixProcessorFunction): void {
        this.metadataPrefixProcessors.set(keyPrefix, processor);
    }

    public async processMetadata(key: string, value: unknown, senderId: string, space: Space): Promise<unknown> {
        const processor = this.metadataProcessors.get(key);
        if (processor) {
            return await processor(value, senderId, space);
        }
        for (const [keyPrefix, prefixProcessor] of this.metadataPrefixProcessors.entries()) {
            if (key.startsWith(keyPrefix)) {
                return prefixProcessor(key, value, senderId, space);
            }
        }
        return value;
    }
}
