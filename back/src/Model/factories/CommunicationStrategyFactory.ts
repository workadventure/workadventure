import { CommunicationType } from "../types/CommunicationTypes";
import { ICommunicationStrategy } from "../interfaces/ICommunicationStrategy";
import { ICommunicationSpaceManager } from "../interfaces/ICommunicationSpaceManager";
import { WebRTCCommunicationStrategy } from "../strategies/WebRTCCommunicationStrategy";
import { DefaultCommunicationStrategy } from "../strategies/DefaultCommunicationStrategy";
import { LivekitCommunicationStrategy } from "../strategies/LivekitCommunicationStrategy";

export class CommunicationStrategyFactory {
    public static create(
        type: CommunicationType,
        space: ICommunicationSpaceManager
    ): ICommunicationStrategy {
        switch (type) {
            case CommunicationType.WEBRTC:
                return new WebRTCCommunicationStrategy(space);
            case CommunicationType.LIVEKIT:
                return new LivekitCommunicationStrategy(space);
            case CommunicationType.NONE:
            default:
                return new DefaultCommunicationStrategy(space);
        }
    }
} 