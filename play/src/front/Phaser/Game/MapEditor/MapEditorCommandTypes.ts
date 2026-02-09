import type { EditMapCommandMessage } from "@workadventure/messages";

export type EditMapMessage = NonNullable<EditMapCommandMessage["editMapMessage"]>["message"];
