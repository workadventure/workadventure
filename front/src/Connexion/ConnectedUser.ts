export class ConnectedUser {
    id: string;
    name: string;
    email: string;
    x: number;
    y: number;
    roomId: string
    
    constructor( id: string,name: string, email: string, x: number, y: number) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.x = x;
        this.y = y;
        this.roomId = "THECODINGMACHINE";
    }
}