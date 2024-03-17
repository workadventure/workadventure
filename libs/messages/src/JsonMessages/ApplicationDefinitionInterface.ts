import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isApplicationDefinitionInterface = z.object({
  name: extendApi(z.string(), {
    description: "The name of the application",
    example: "Onboarding woka",
  }),
  script: extendApi(z.string().optional().nullable(), {
    description: "The url of the application",
    example: "http://example.com/my/script.js",
  }),
  doc: extendApi(z.string().optional().nullable(), {
    description: "The url of the documentation",
    example: "http://example.com/my/doc.html",
  }),
  image: extendApi(z.string().optional().nullable(), {
    description: "The url of the application icon",
    example: "http://example.com/my/image.png",
  }),
  description: extendApi(z.string().optional().nullable(), {
    description: "The description of the application",
    example: "This application is a great application",
  }),
});
export type ApplicationDefinitionInterface = z.infer<
  typeof isApplicationDefinitionInterface
>;
