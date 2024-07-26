import { z } from "zod";

export const TeamsAvailability = z.enum([
    "Available",
    "AvailableIdle",
    "Away",
    "BeRightBack",
    "Busy",
    "BusyIdle",
    "DoNotDisturb",
    "Offline",
    "PresenceUnknown",
]);

export type TeamsAvailability = z.infer<typeof TeamsAvailability>;

export const TeamsActivity = z.enum([
    "Available",
    "Away",
    "BeRightBack",
    "Busy",
    "DoNotDisturb",
    "InACall",
    "InAConferenceCall",
    "Inactive",
    "InAMeeting",
    "Offline",
    "OffWork",
    "OutOfOffice",
    "PresenceUnknown",
    "Presenting",
    "UrgentInterruptionsOnly",
]);

export type TeamsActivity = z.infer<typeof TeamsActivity>;
