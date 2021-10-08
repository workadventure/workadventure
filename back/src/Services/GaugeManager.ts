import { Counter, Gauge } from "prom-client";

//this class should manage all the custom metrics used by prometheus
class GaugeManager {
    private nbClientsGauge: Gauge<string>;
    private nbClientsPerRoomGauge: Gauge<string>;
    private nbGroupsPerRoomGauge: Gauge<string>;
    private nbGroupsPerRoomCounter: Counter<string>;
    private nbRoomsGauge: Gauge<string>;

    constructor() {
        this.nbRoomsGauge = new Gauge({
            name: "workadventure_nb_rooms",
            help: "Number of active rooms",
        });
        this.nbClientsGauge = new Gauge({
            name: "workadventure_nb_sockets",
            help: "Number of connected sockets",
            labelNames: [],
        });
        this.nbClientsPerRoomGauge = new Gauge({
            name: "workadventure_nb_clients_per_room",
            help: "Number of clients per room",
            labelNames: ["room"],
        });

        this.nbGroupsPerRoomCounter = new Counter({
            name: "workadventure_counter_groups_per_room",
            help: "Counter of groups per room",
            labelNames: ["room"],
        });
        this.nbGroupsPerRoomGauge = new Gauge({
            name: "workadventure_nb_groups_per_room",
            help: "Number of groups per room",
            labelNames: ["room"],
        });
    }

    incNbRoomGauge(): void {
        this.nbRoomsGauge.inc();
    }
    decNbRoomGauge(): void {
        this.nbRoomsGauge.dec();
    }

    incNbClientPerRoomGauge(roomId: string): void {
        this.nbClientsGauge.inc();
        this.nbClientsPerRoomGauge.inc({ room: roomId });
    }

    decNbClientPerRoomGauge(roomId: string): void {
        this.nbClientsGauge.dec();
        this.nbClientsPerRoomGauge.dec({ room: roomId });
    }
}

export const gaugeManager = new GaugeManager();
