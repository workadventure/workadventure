import { AvailabilityStatus } from "@workadventure/messages";
import { StatusStrategyInterface } from "../StatusStrategyInterface";
import { BusyStatusStrategy } from "../StatusStrategy/BusyStatusStrategy";
import { BackInAMomentStatusStrategy } from "../StatusStrategy/BackInAMomentStatusStrategy";
import { BasicStatusStrategy } from "../StatusStrategy/BasicStatusStrategy";
import { StatusStrategyFactoryInterface } from "../StatusChanger";
import { DoNotDisturbStatusStrategy } from "../StatusStrategy/DoNotDisturbStatusStrategy";

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
