import {ExtRoomsInterface} from "./ExtRoomsInterface";
import socketIO = require('socket.io');
import {ExSocketInterface} from "_Model/Websocket/ExSocketInterface";

export class ExtRooms implements ExtRoomsInterface{
    userPositionMapByRoom: any;
    refreshUserPosition: any;

    [room: string]: SocketIO.Room;
}

let RefreshUserPositionFunction = function(rooms : ExtRooms, Io: socketIO.Server){
    let clients = Io.clients();
    let socketsKey = Object.keys(Io.clients().sockets);

    //create mapping with all users in all rooms
    let mapPositionUserByRoom = new Map();
    for(let i = 0; i < socketsKey.length; i++){
        let socket = clients.sockets[socketsKey[i]] as ExSocketInterface;
        if(!socket.position){
            continue;
        }
        let data = {
            userId : socket.userId,
            roomId : socket.roomId,
            position : socket.position,
        };
        let dataArray = <any>[];
        if(mapPositionUserByRoom.get(data.roomId)){
            dataArray = mapPositionUserByRoom.get(data.roomId);
            dataArray.push(data);
        }else{
            dataArray = [data];
        }
        mapPositionUserByRoom.set(data.roomId, dataArray);
    }
    rooms.userPositionMapByRoom = Array.from(mapPositionUserByRoom);
}

export {
    RefreshUserPositionFunction
}