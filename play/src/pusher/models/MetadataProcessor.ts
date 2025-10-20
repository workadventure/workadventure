import { SocketData } from "./Websocket/SocketData";

type MetadataProcessorFunction = (value: unknown, senderSocketData: SocketData) => unknown;
export class MetadataProcessor {
    private metadataProcessors = new Map<string, MetadataProcessorFunction>();

    public registerMetadataProcessor(key: string, processor: MetadataProcessorFunction): void {
        this.metadataProcessors.set(key, processor);
    }

    public processMetadata(key: string, value: unknown, senderSocketData: SocketData): unknown {
        const processor = this.metadataProcessors.get(key);
        if (processor) {
            return processor(value, senderSocketData);
        }
        return value;
    }
} 

