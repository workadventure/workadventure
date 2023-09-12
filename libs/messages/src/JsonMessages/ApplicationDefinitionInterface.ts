import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isApplicationDefinitionInterface = z.object({
  name: extendApi(z.string(), {
    description: "The name of the application",
    example: "Onboarding woka",
  }),
  script: extendApi(z.string(), {
    description: "The url of the application",
    example: "http://example.com/my/script.js",
  }),
});
export type ApplicationDefinitionInterface = z.infer<
  typeof isApplicationDefinitionInterface
>;
