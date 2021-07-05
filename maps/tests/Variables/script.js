WA.onInit().then(() => {
    console.log('Trying to read variable "doorOpened" whose default property is true. This should display "true".');
    console.log('doorOpened', WA.room.loadVariable('doorOpened'));

    console.log('Trying to set variable "not_exists". This should display an error in the console.')
    WA.room.saveVariable('not_exists', 'foo');

    console.log('Trying to set variable "config". This should work.');
    WA.room.saveVariable('config', {'foo': 'bar'});

    console.log('Trying to read variable "config". This should display a {"foo": "bar"} object.');
    console.log(WA.room.loadVariable('config'));
});
