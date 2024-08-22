import { z } from "zod";
import { AvailabilityStatus } from "@workadventure/messages";

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

export interface InitMSTeamsOptions {
    subscribeToStatusUpdates?: boolean;
    onTeamsStatusChange: (workAdventureNewStatus: AvailabilityStatus) => void;
}

export interface MSTeamsIntegration {
    init: (authenticationToken: string, options?: InitMSTeamsOptions) => boolean;
    setTeamsStatus: (newStatus: AvailabilityStatus) => void;
    joinTeamsMeeting: () => void;
}
