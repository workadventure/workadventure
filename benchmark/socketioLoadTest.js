'use strict';

require("../messages/generated/messages_pb");
//import {PositionMessage, UserMovesMessage, ViewportMessage} from "../messages/generated/messages_pb";

module.exports = {
    setYRandom
};

function setYRandom(context, events, done) {
    if (context.angle === undefined) {
        context.angle = Math.random() * Math.PI * 2;
    }
    context.angle += 0.05;

    context.vars.x = 320 + 1472/2 * (1 + Math.sin(context.angle));
    context.vars.y = 200 + 1090/2 * (1 + Math.cos(context.angle));
    context.vars.left = context.vars.x - 320;
    context.vars.top = context.vars.y - 200;
    context.vars.right = context.vars.x + 320;
    context.vars.bottom = context.vars.y + 200;
    return done();
}

function setUserMovesMessage(context, events, done) {
    if (context.angle === undefined) {
        context.angle = Math.random() * Math.PI * 2;
    }
    context.angle += 0.05;

    const x = Math.floor(320 + 1472/2 * (1 + Math.sin(context.angle)));
    const y = Math.floor(200 + 1090/2 * (1 + Math.cos(context.angle)));

    const positionMessage = new PositionMessage();
    positionMessage.setX(x);
    positionMessage.setY(y);
    positionMessage.setDirection(PositionMessage.Direction.UP);
    positionMessage.setMoving(false);

    const viewportMessage = new ViewportMessage();
    viewportMessage.setTop(y - 200);
    viewportMessage.setBottom(y + 200);
    viewportMessage.setLeft(x - 320);
    viewportMessage.setRight(x + 320);

    const userMovesMessage = new UserMovesMessage();
    userMovesMessage.setPosition(positionMessage);
    userMovesMessage.setViewport(viewportMessage);

    context.vars.message = userMovesMessage.serializeBinary().buffer;
    console.log(context.vars.message);
    return done();
}
