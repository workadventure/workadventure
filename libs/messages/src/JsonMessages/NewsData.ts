import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const NewsData = z.object({
    id: extendApi(z.union([z.string(), z.number()]), {
        description: "Unique identifier of the news item.",
        example: "new-chat-feature",
    }),
    iframeUrl: extendApi(z.string().optional(), {
        description: "URL to display in an iframe.",
        example: "https://example.com/news/new-chat-feature",
    }),
});

export type NewsData = z.infer<typeof NewsData>;
