import { z } from "zod";

export const isLiveFile = z.object({
    path: z.string(),
    name: z.string(),
    extension: z.string(),
    etag: z.string(),
    content: z.string(),
    buffer: z.instanceof(Buffer),
    last_update: z.number(),
});

export type LiveFile = z.infer<typeof isLiveFile>;

export const isLiveDirectory = z.object({
    path: z.string(),
    watcher: z.unknown(),
    tree: z.unknown(),
    files: z.record(z.string(), isLiveFile),
    get: z
        .function()
        .args(z.string())
        .returns(z.union([z.undefined(), isLiveFile.passthrough()])),
});

export type LiveDirectory = z.infer<typeof isLiveDirectory>;
