import {Rooms} from "socket.io";

export interface ExtRoomsInterface extends Rooms{
    userPositionMapByRoom: any;
    refreshUserPosition: any;
}