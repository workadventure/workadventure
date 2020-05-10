import {ExtRoomsInterface} from "./ExtRoomsInterface";
import socketIO = require('socket.io');
import {ExSocketInterface} from "./ExSocketInterface";
import {MessageUserPosition} from "./MessageUserPosition";
import {World} from "_Model/World";

export class ExtRooms implements ExtRoomsInterface{
    userPositionMapByRoom: any;
    refreshUserPosition: any;
    Worlds: any;

    [room: string]: SocketIO.Room;
}

let RefreshUserPositionFunction = function(rooms : ExtRooms, Io: socketIO.Server, Worlds: Map<string, World>) {
    let clients = Io.clients();
    let socketsKey = Object.keys(Io.clients().sockets);

    //create mapping with all users in all rooms
    let mapPositionUserByRoom = new Map();
    for (let i = 0; i < socketsKey.length; i++) {
        let socket = clients.sockets[socketsKey[i]] as ExSocketInterface;
        if (!socket.position) {
            continue;
        }
        let data = {
            userId: socket.userId,
            roomId: socket.roomId,
            position: socket.position,
            name: socket.name,
            character: socket.character,
        };
        let dataArray = <any>[];
        if (mapPositionUserByRoom.get(data.roomId)) {
            dataArray = mapPositionUserByRoom.get(data.roomId);
            dataArray.push(data);
        } else {
            dataArray = [data];
        }
        mapPositionUserByRoom.set(data.roomId, dataArray);

        // update position in the worl
        let messageUserPosition = new MessageUserPosition(data);
        let world = Worlds.get(messageUserPosition.roomId);
        if(world) {
            world.updatePosition(messageUserPosition);
            Worlds.set(messageUserPosition.roomId, world);
        }
    }
    rooms.userPositionMapByRoom = Array.from(mapPositionUserByRoom);
}

export {
    RefreshUserPositionFunction
}
