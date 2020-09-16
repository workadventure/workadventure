'use strict';

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
