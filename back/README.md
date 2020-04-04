# Back Features

## Login
To start your game, you must authenticate on the server back.
When you are authenticated, the back server return token and room starting.
```
POST => /login 
Params : 
    email: email of user.
```

## Join a room
When a user is connected, the user can join a room.
So you must send emit `join-room` with information user:
```
Socket.io => 'join-room'

    userId: user id of gamer
    roomId: room id when user enter in game
    position: {
        x: position x on map
        y: position y on map
    }
```
All data users are stocked on socket client.

## Send position user
When user move on the map, you can share new position on back with event  `user-position`.
The information sent:
```
Socket.io => 'user-position'

    userId: user id of gamer
    roomId: room id when user enter in game
    position: {
        x: position x on map
        y: position y on map
    }
```
All data users are updated on socket client.

## Receive positions of all users
The application sends position of all users in each room in every few 10 milliseconds.
The data will pushed on event `user-position`:
```
Socket.io => 'user-position'

    [
        {
            userId: user id of gamer
            roomId: room id when user enter in game
            position: {
                x: position x on map
                y: position y on map
            }
        },
        ...
    ]
```

[<<< back](../README.md) 