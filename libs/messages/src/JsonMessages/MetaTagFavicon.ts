import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isMetaTagFavicon = z.object({
  rel: extendApi(z.string(), {
    description: "Device specification",
    example: "apple-touch-icon",
  }),
  sizes: extendApi(z.string(), {
    description: "Icon sizes",
    example: "57x57",
  }),
  src: extendApi(z.string(), {
    description: "Icon path",
    example: "https://workadventu.re/icons/apple-icon-57x57.png",
  }),
});
export type MetaTagFavicon = z.infer<typeof isMetaTagFavicon>;
