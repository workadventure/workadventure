'use strict';

module.exports = {
    setYRandom
};

function setYRandom(context, events, done) {
    context.vars.x = (883 +  Math.round(Math.random() * 300));
    context.vars.y = (270 +  Math.round(Math.random() * 300));
    return done();
}
