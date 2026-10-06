import type { AvailabilityStatus } from "@workadventure/messages";
import type { StatusStrategyInterface } from "./StatusStrategyInterface";
import { BasicStatusStrategy } from "./StatusStrategy/BasicStatusStrategy";

export interface StatusStrategyFactoryInterface {
    createStrategy: (newStatus: AvailabilityStatus) => StatusStrategyInterface;
}

/**
 * Applies the side rules that come with a status (timed rules, notification sound policy).
 *
 * It only ever *observes* availabilityStatusStore, which already decided the status by
 * priority — so it deliberately vets nothing. It used to reject "impossible" transitions,
 * but the store emits them routinely (a BUSY user walking into a silent zone) and
 * GameScene sends the status to the back off its own subscription regardless. The
 * rejection could not undo a status, only skip these rules and leave the strategy behind.
 */
export class StatusChanger {
    constructor(
        private _StatusStrategyFactory: StatusStrategyFactoryInterface,
        private _statusStrategy: StatusStrategyInterface = new BasicStatusStrategy(),
    ) {
        this._statusStrategy.applyAllRules();
    }
    getActualStatus(): AvailabilityStatus {
        return this._statusStrategy.getActualStatus();
    }
    changeStatusTo(newStatus: AvailabilityStatus) {
        this._statusStrategy.cleanTimedRules();
        this.setStrategy(newStatus);
        this._statusStrategy.applyAllRules();
    }

    private setStrategy(newStatus: AvailabilityStatus) {
        this._statusStrategy = this._StatusStrategyFactory.createStrategy(newStatus);
    }

    setUserNameInteraction(name: string) {
        this._statusStrategy.setUserNameInteraction(name);
    }

    applyInteractionRules() {
        this._statusStrategy.applyInteractionRules();
    }
    allowNotificationSound(): boolean {
        return this._statusStrategy.allowNotificationSound();
    }

    applyTimedRules(): void {
        this._statusStrategy.applyTimedRules();
    }
}
