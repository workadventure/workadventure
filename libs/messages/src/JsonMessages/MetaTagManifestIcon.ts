import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isMetaTagManifestIcon = extendApi(
  z.object({
    sizes: extendApi(z.string(), {
      description: "Icon sizes",
      example: "57x57 64x64",
    }),
    src: extendApi(z.string(), {
      description: "Icon path",
      example: "https://workadventu.re/icons/apple-icon-57x57.png",
    }),
    type: extendApi(z.string().optional(), {
      description:
        "A hint as to the media type of the image. The purpose of this member is to allow a user agent to quickly ignore images with media types it does not support.",
      example: "image/webp",
    }),
    purpose: extendApi(z.string().optional(), {
      description:
        "Defines the purpose of the image, for example if the image is intended to serve some special purpose in the context of the host OS (i.e., for better integration).",
      example: "any",
    }),
  }),
  {
    description: "An icon as represented in the manifest.json file (for PWA)",
  }
);
export type MetaTagManifestIcon = z.infer<typeof isMetaTagManifestIcon>;
