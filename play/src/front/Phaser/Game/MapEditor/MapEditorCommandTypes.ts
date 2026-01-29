import type { EditMapCommandMessage } from "@workadventure/messages";

export type EditMapMessage = NonNullable<EditMapCommandMessage["editMapMessage"]>["message"];

export type AreaEditMapMessage = Extract<
    EditMapMessage,
    { $case: "modifyAreaMessage" | "createAreaMessage" | "deleteAreaMessage" }
>;

export type EntityEditMapMessage = Extract<
    EditMapMessage,
    {
        $case:
            | "modifyEntityMessage"
            | "createEntityMessage"
            | "deleteEntityMessage"
            | "uploadEntityMessage"
            | "modifyCustomEntityMessage"
            | "deleteCustomEntityMessage";
    }
>;

export type WAMSettingsEditMapMessage = Extract<EditMapMessage, { $case: "updateWAMSettingsMessage" }>;
