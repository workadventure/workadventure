/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

module.exports = {
    setYRandom
};

function setYRandom(context, events, done) {
    context.vars.x = (883 +  Math.round(Math.random() * 300));
    context.vars.y = (270 +  Math.round(Math.random() * 300));
    return done();
}