import type { IncomingSpaceMetadata, SpaceMetadataPrefix } from "@workadventure/shared-utils";
import { parseIncomingSpaceMetadata } from "@workadventure/shared-utils";
import type { Space } from "./Space";

type MetadataProcessorFunction<K extends string> = (
    value: IncomingSpaceMetadata<K>,
    senderId: string,
    space: Space,
) => Promise<unknown>;

type MetadataPrefixProcessorFunction<P extends string> = (
    key: `${P}${string}`,
    value: IncomingSpaceMetadata<`${P}${string}`>,
    senderId: string,
    space: Space,
) => Promise<unknown>;

// Erased signatures for the registries. The public register* methods keep the per-key typing and cast once
// on the way in, so no caller ever has to.
type ErasedMetadataProcessor = (value: never, senderId: string, space: Space) => Promise<unknown>;
type ErasedMetadataPrefixProcessor = (key: string, value: never, senderId: string, space: Space) => Promise<unknown>;

export class MetadataProcessor {
    private metadataProcessors = new Map<string, ErasedMetadataProcessor>();
    private metadataPrefixProcessors = new Map<string, ErasedMetadataPrefixProcessor>();

    public registerMetadataProcessor<K extends string>(key: K, processor: MetadataProcessorFunction<K>): void {
        this.metadataProcessors.set(key, processor);
    }

    public registerMetadataPrefixProcessor<P extends SpaceMetadataPrefix>(
        keyPrefix: P,
        processor: MetadataPrefixProcessorFunction<P>,
    ): void {
        this.metadataPrefixProcessors.set(keyPrefix, processor as ErasedMetadataPrefixProcessor);
    }

    /**
     * Validates the incoming value against the shared space-metadata catalogue, then hands it to the
     * processor registered for that key.
     *
     * The check happens here, once, on reception: past this point the value has the shape the catalogue
     * declares for the key, which is what lets the processors take a typed value instead of `unknown`.
     * Throws (so the caller drops the key) when the payload does not match, or when the key is server-owned
     * and a client tried to write it. A key the catalogue does not describe -- scripting API metadata --
     * passes through untouched.
     */
    public async processMetadata(key: string, value: unknown, senderId: string, space: Space): Promise<unknown> {
        const parsedValue = parseIncomingSpaceMetadata(key, value) as never;

        const processor = this.metadataProcessors.get(key);
        if (processor) {
            return await processor(parsedValue, senderId, space);
        }
        for (const [keyPrefix, prefixProcessor] of this.metadataPrefixProcessors.entries()) {
            if (key.startsWith(keyPrefix)) {
                return prefixProcessor(key, parsedValue, senderId, space);
            }
        }
        return parsedValue;
    }
}
