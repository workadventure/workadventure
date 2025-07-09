import { PrivateSpaceEvent, SpaceEvent } from "@workadventure/messages";
import {Space} from "./Space";

type CorePrivateEvent = NonNullable<PrivateSpaceEvent["event"]>;
type PrivateProcessor = (event: CorePrivateEvent, senderId: string, receiverId: string) => CorePrivateEvent;

type CorePublicEvent = NonNullable<SpaceEvent["event"]>;
type PublicProcessor = (event: CorePublicEvent, sender: string, space : Space) => Promise<CorePublicEvent>;

/**
 * This class is in charge of processing some public/private events sent in spaces on the server side.
 */
export class EventProcessor {
    private privateEventProcessors = new Map<CorePrivateEvent["$case"], PrivateProcessor>();
    private publicEventProcessors = new Map<CorePublicEvent["$case"], PublicProcessor>();

    public registerPrivateEventProcessor(eventCase: CorePrivateEvent["$case"], processor: PrivateProcessor): void {
        this.privateEventProcessors.set(eventCase, processor);
    }

    public processPrivateEvent(event: CorePrivateEvent, senderId: string, receiverId: string): CorePrivateEvent {
        const processor = this.privateEventProcessors.get(event.$case);
        if (processor) {
            return processor(event, senderId, receiverId);
        }
        return event;
    }

    public registerPublicEventProcessor(eventCase: CorePublicEvent["$case"], processor: PublicProcessor): void {
        this.publicEventProcessors.set(eventCase, processor);
    }

    public async processPublicEvent(event: CorePublicEvent, senderId: string , space : Space): Promise<CorePublicEvent> {

        const processor = this.publicEventProcessors.get(event.$case);
        if (processor) {
            return processor(event, senderId, space);
        }
        return event;
    }
}
