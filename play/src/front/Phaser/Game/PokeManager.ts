import { Subscription } from "rxjs";
import { RoomConnection } from "../../Connection/RoomConnection";
import { bubbleModalVisibility } from "../../Stores/AvailabilityStatusModalsStore";

export class PokeManager {
    private subscription: Subscription;

    constructor(private connection: RoomConnection) {
        this.subscription = this.connection.pokeUserMessageStream.subscribe((pokeUserMessage) => {
            console.log(pokeUserMessage);
            bubbleModalVisibility.open(pokeUserMessage.pokingUser);
        });
    }

    public close() {
        this.subscription.unsubscribe();
    }
}
