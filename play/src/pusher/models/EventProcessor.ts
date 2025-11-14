import { PrivateSpaceEvent, SpaceEvent } from "@workadventure/messages";
import { SpaceUserExtended } from "./Space";
import { SocketData } from "./Websocket/SocketData";

type CorePrivateEvent = NonNullable<PrivateSpaceEvent["event"]>;
type PrivateProcessor = (
    event: CorePrivateEvent,
    sender: SpaceUserExtended | undefined,
    receiver: SpaceUserExtended
) => CorePrivateEvent;

type CorePublicEvent = NonNullable<SpaceEvent["event"]>;
type PublicProcessor = (
    event: CorePublicEvent,
    sender: SpaceUserExtended | undefined,
    socketData: SocketData
) => CorePublicEvent;

/**
 * This class is in charge of processing some public/private events sent in spaces on the server side.
 */
export class EventProcessor {
    private privateEventProcessors = new Map<CorePrivateEvent["$case"], PrivateProcessor>();
    private publicEventProcessors = new Map<CorePublicEvent["$case"], PublicProcessor>();

    public registerPrivateEventProcessor(eventCase: CorePrivateEvent["$case"], processor: PrivateProcessor): void {
        this.privateEventProcessors.set(eventCase, processor);
    }

    public processPrivateEvent(
        event: CorePrivateEvent,
        sender: SpaceUserExtended | undefined,
        receiver: SpaceUserExtended
    ): CorePrivateEvent {
        const processor = this.privateEventProcessors.get(event.$case);
        if (processor) {
            return processor(event, sender, receiver);
        }
        return event;
    }

    public registerPublicEventProcessor(eventCase: CorePublicEvent["$case"], processor: PublicProcessor): void {
        this.publicEventProcessors.set(eventCase, processor);
    }

    public processPublicEvent(
        event: CorePublicEvent,
        sender: SpaceUserExtended | undefined,
        senderSocketData: SocketData
    ): CorePublicEvent {
        const processor = this.publicEventProcessors.get(event.$case);
        if (processor) {
            return processor(event, sender, senderSocketData);
        }
        return event;
    }
}
