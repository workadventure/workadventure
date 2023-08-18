import {z} from "zod";

export const IframelyLink = z.object({
    href: z.string(),
    rel: z.string().array().optional(),
    type: z.string().optional(),
    media: z.object({
        width: z.number().optional(),
        height: z.number().optional(),
        "aspect-ratio": z.number().optional(),
    }).optional(),
    html: z.string().optional(),
});
export type IframelyLink = z.infer<typeof IframelyLink>;

export const IframelyResponse = z.object({
    meta: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        author_url: z.string().optional(),
        author: z.string().optional(),
        site: z.string().optional(),
        canonical: z.string().optional(),
        duration: z.number().optional(),
        date: z.string().optional(),
        medium: z.string().optional(),
    }),
    rel: z.string().array().optional(),
    links: z.object({
        player: z.array(IframelyLink).optional(),
        thumbnail: z.array(IframelyLink).optional(),
        app: z.array(IframelyLink).optional(),
        image: z.array(IframelyLink).optional(),
        reader: z.array(IframelyLink).optional(),
        survey: z.array(IframelyLink).optional(),
        summary: z.array(IframelyLink).optional(),
        icon: z.array(IframelyLink).optional(),
        logo: z.array(IframelyLink).optional(),
    }).catchall(z.array(IframelyLink).optional()).optional(),
    html: z.string().optional(),
});
export type IframelyResponse = z.infer<typeof IframelyResponse>;