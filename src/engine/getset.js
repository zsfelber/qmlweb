/* eslint accessor-pairs: 0 */

function setupGetter(obj, propName, get, owner, enumerable=false) {
  Object.defineProperty(obj, propName, {
    get, owner,
    configurable: true,
    enumerable
  });
}

function setupSetter(obj, propName, set, owner, enumerable=false) {
  Object.defineProperty(obj, propName, {
    set, owner,
    configurable: true,
    enumerable
  });
}

function setupValue(obj, propName, value, owner, enumerable=false, writable=false) {
  Object.defineProperty(obj, propName, {
    value, owner,
    writable, enumerable,
    configurable: true,
  });
}

function setupGetterSetter(obj, propName, get, set, owner, enumerable=false) {
  Object.defineProperty(obj, propName, {
    get, set, owner,
    configurable: true,
    enumerable
  });
}


QmlWeb.setupGetter = setupGetter;
QmlWeb.setupSetter = setupSetter;
QmlWeb.setupGetterSetter = setupGetterSetter;
