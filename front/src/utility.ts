export function deepFreezeClone<T> (obj:T):Readonly<T> {
    return deepFreeze(JSON.parse(JSON.stringify(obj)));
}

function deepFreeze<T> (obj:T):T{
  Object.freeze(obj);
  if (obj === undefined) {
    return obj;
  }
  const propertyNames = Object.getOwnPropertyNames(obj) as Array<keyof T>;
  propertyNames.forEach(function (prop) {
    if (obj[prop] !== null&& (typeof obj[prop] === "object" || typeof obj[prop] === "function") && !Object.isFrozen(obj[prop])) {
      deepFreezeClone(obj[prop]);
    }
  });

  return obj;
}