import { MapStorageStream } from "../MapStorageServer";

class UploadDetector {
    private streams: Map<string, Set<MapStorageStream>> = new Map<string, Set<MapStorageStream>>();

    public registerStream(mapKey: string, stream: MapStorageStream): void {
        let givenStreams = this.streams.get(mapKey);
        if (!givenStreams) {
            givenStreams = new Set<MapStorageStream>();
            this.streams.set(mapKey, givenStreams);
        }

        givenStreams.add(stream);
    }

    public clearStream(mapKey: string, stream: MapStorageStream): void {
        const mapStreams = this.streams.get(mapKey);
        mapStreams?.delete(stream);

        if (mapStreams?.size === 0) {
            this.streams.delete(mapKey);
        }
    }

    public refresh(mapKey: string): void {
        const streams = this.streams.get(mapKey);
        if (!streams) {
            return;
        }
        for (const stream of streams) {
            stream.write({
                message: {
                    $case: "mapStorageRefreshMessage",
                    mapStorageRefreshMessage: {
                        comment: "New version of map detected. Refresh needed",
                    },
                },
            });
        }
    }
}

export const uploadDetector = new UploadDetector();
