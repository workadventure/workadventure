import { FilterType } from "@workadventure/messages";
import type { SpaceNotificationStrategy } from "./SpaceNotificationStrategy";
import { DefaultNotificationStrategy } from "./DefaultNotificationStrategy";
import { LiveStreamingNotificationStrategy } from "./LiveStreamingNotificationStrategy";

/**
 * Factory for creating SpaceNotificationStrategy instances based on filter type.
 *
 * Following the Factory Pattern and Open/Closed Principle:
 * - To add a new filter type, create a new strategy class and add a case here
 * - No modification needed to existing strategies or SpaceToFrontDispatcher
 */
export class SpaceNotificationStrategyFactory {
    private static defaultStrategy = new DefaultNotificationStrategy();
    private static liveStreamingStrategy = new LiveStreamingNotificationStrategy();

    /**
     * Creates or returns a cached strategy instance for the given filter type.
     * Strategies are stateless singletons, so we can reuse them.
     */
    static getStrategy(filterType: FilterType): SpaceNotificationStrategy {
        switch (filterType) {
            case FilterType.LIVE_STREAMING_USERS_WITH_FEEDBACK:
                return this.liveStreamingStrategy;

            case FilterType.ALL_USERS:
            case FilterType.LIVE_STREAMING_USERS:
            default:
                return this.defaultStrategy;
        }
    }

    /**
     * Returns the LiveStreamingNotificationStrategy for direct access to role-related methods.
     * This is useful when SpaceToFrontDispatcher needs to call handleRoleChange directly.
     */
    static getLiveStreamingStrategy(): LiveStreamingNotificationStrategy {
        return this.liveStreamingStrategy;
    }
}
