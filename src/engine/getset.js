/* eslint accessor-pairs: 0 */

function setupGetter(obj, propName, func, owner, enumerable=false) {
  Object.defineProperty(obj, propName, {
    get: func,
    owner: owner,
    configurable: true,
    enumerable
  });
}

function setupSetter(obj, propName, func, owner, enumerable=false) {
  Object.defineProperty(obj, propName, {
    set: func,
    owner: owner,
    configurable: true,
    enumerable
  });
}

function setupGetterSetter(obj, propName, getter, setter, owner, enumerable=false) {
  Object.defineProperty(obj, propName, {
    get: getter,
    set: setter,
    owner: owner,
    configurable: true,
    enumerable
  });
}


QmlWeb.setupGetter = setupGetter;
QmlWeb.setupSetter = setupSetter;
QmlWeb.setupGetterSetter = setupGetterSetter;
