WA.onInit().then(() => {
    console.log('Trying to read variable "doorOpened" whose default property is true. This should display "true".');
    console.log('doorOpened', WA.room.loadVariable('doorOpened'));

    console.log('Trying to set variable "not_exists". This should display an error in the console, followed by a log saying the error was caught.')
    WA.room.saveVariable('not_exists', 'foo').catch((e) => {
        console.log('Successfully caught error: ', e);
    });

    console.log('Trying to set variable "myvar". This should work.');
    WA.room.saveVariable('myvar', {'foo': 'bar'});

    console.log('Trying to read variable "myvar". This should display a {"foo": "bar"} object.');
    console.log(WA.room.loadVariable('myvar'));

    console.log('Trying to set variable "config". This should not work because we are not logged as admin.');
    WA.room.saveVariable('config', {'foo': 'bar'}).catch(e => {
        console.log('Successfully caught error because variable "config" is not writable: ', e);
    });
});
