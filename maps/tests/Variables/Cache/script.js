WA.onInit().then(async () => {
    console.log('Trying to set variable "myvar". This should work, even if the cache was busted.');
    await WA.state.saveVariable('myvar', {'foo': 'bar'});
    console.log('SUCCESS!');
});
