'use strict';

module.exports = {
    setYRandom
};

function setYRandom(context, events, done) {
    context.vars.x = (0 +  Math.round(Math.random() * 1472));
    context.vars.y = (0 +  Math.round(Math.random() * 1090));
    context.vars.left = context.vars.x - 320;
    context.vars.top = context.vars.y - 200;
    context.vars.right = context.vars.x + 320;
    context.vars.bottom = context.vars.y + 200;
    return done();
}
