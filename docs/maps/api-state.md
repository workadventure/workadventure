{.section-title.accent.text-primary}
# API state related functions Reference

## Saving / loading state

The `WA.state` functions allow you to easily share a common state between all the players in a given room.
Moreover, `WA.state` functions can be used to persist this state across reloads.

```
WA.state.saveVariable(key : string, data : unknown): void
WA.state.loadVariable(key : string) : unknown
WA.state.hasVariable(key : string) : boolean
WA.state.onVariableChange(key : string).subscribe((data: unknown) => {}) : Subscription
WA.state.[any property]: unknown
```

These methods and properties can be used to save, load and track changes in [variables related to the current room](variables.md).

Variables stored in `WA.state` can be any value that is serializable in JSON.

Please refrain from storing large amounts of data in a room. Those functions are typically useful for saving or restoring
configuration / metadata.

{.alert.alert-warning}
We are in the process of fine-tuning variables, and we will eventually put limits on the maximum size a variable can hold. We will also put limits on the number of calls you can make to saving variables, so don't change the value of a variable every 10ms, this will fail in the future.


Example :
```javascript
WA.state.saveVariable('config', {
    'bottomExitUrl': '/@/org/world/castle',
    'topExitUrl': '/@/org/world/tower',
    'enableBirdSound': true
}).catch(e => console.error('Something went wrong while saving variable', e));
//...
let config = WA.state.loadVariable('config');
```

You can use the shortcut properties to load and save variables. The code above is similar to:

```javascript
WA.state.config = {
    'bottomExitUrl': '/@/org/world/castle',
    'topExitUrl': '/@/org/world/tower',
    'enableBirdSound': true
};

//...
let config = WA.state.config;
```

Note: `saveVariable` returns a promise that will fail in case the variable cannot be saved. This
can happen if your user does not have the required rights (more on that in the next chapter).
In contrast, if you use the WA.state properties, you cannot access the promise and therefore cannot
know for sure if your variable was properly saved.

If you are using Typescript, please note that the type of variables is `unknown`. This is
for security purpose, as we don't know the type of the variable. In order to use the returned value,
you will need to cast it to the correct type (or better, use a [Type guard](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) to actually check at runtime
that you get the expected type).

{.alert.alert-warning}
For security reasons, the list of variables you are allowed to access and modify is **restricted** (otherwise, anyone on your map could set any data).
Variables storage is subject to an authorization process. Read below to learn more.

## Defining a variable

Out of the box, you cannot edit *any* variable. Variables MUST be declared in the map.

Check the [dedicated variables page](variables.md) to learn how to declare a variable in a map.

## Tracking variables changes

The properties of the `WA.state` object are shared in real-time between users of a same room. You can listen to modifications
of any property of `WA.state` by using the `WA.state.onVariableChange()` method.

```
WA.state.onVariableChange(name: string): Observable<unknown>
```

Usage:

```javascript
WA.state.onVariableChange('config').subscribe((value) => {
    console.log('Variable "config" changed. New value: ', value);
});
```

The `WA.state.onVariableChange` method returns an [RxJS `Observable` object](https://rxjs.dev/guide/observable). This is 
an object on which you can add subscriptions using the `subscribe` method.

### Stopping tracking variables

If you want to stop tracking a variable change, the `subscribe` method returns a subscription object with an `unsubscribe` method.

**Example with unsubscription:**

```javascript
const subscription = WA.state.onVariableChange('config').subscribe((value) => {
    console.log('Variable "config" changed. New value: ', value);
});
// Later:
subscription.unsubscribe();
```
