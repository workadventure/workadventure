import { AvailabilityStatus } from "@workadventure/messages";
import type { StatusStrategyInterface } from "../StatusStrategyInterface.ts";
import { BusyStatusStrategy } from "../StatusStrategy/BusyStatusStrategy.ts";
import { BackInAMomentStatusStrategy } from "../StatusStrategy/BackInAMomentStatusStrategy.ts";
import { BasicStatusStrategy } from "../StatusStrategy/BasicStatusStrategy.ts";
import type { StatusStrategyFactoryInterface } from "../StatusChanger.ts";
import { DoNotDisturbStatusStrategy } from "../StatusStrategy/DoNotDisturbStatusStrategy.ts";

export const StatusStrategyFactory: StatusStrategyFactoryInterface = {
    createStrategy(newStatus: AvailabilityStatus): StatusStrategyInterface {
        switch (newStatus) {
            case AvailabilityStatus.BUSY:
                return new BusyStatusStrategy();
            case AvailabilityStatus.DO_NOT_DISTURB:
                return new DoNotDisturbStatusStrategy();
            case AvailabilityStatus.BACK_IN_A_MOMENT:
                return new BackInAMomentStatusStrategy();
            default:
                return new BasicStatusStrategy(newStatus);
        }
    },
};
