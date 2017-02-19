const notfound = {};

const modules = {
  Main: {
    int: QmlWeb.qmlInteger,
    real: QmlWeb.qmlNumber,
    double: QmlWeb.qmlNumber,
    string: QmlWeb.qmlString,
    bool: QmlWeb.qmlBoolean,
    list: QmlWeb.qmlList,
    color: QmlWeb.QColor,
    enum: QmlWeb.qmlNumber,
    url: QmlWeb.qmlUrl,
    variant: QmlWeb.qmlVariant,
    "var": QmlWeb.qmlVariant
  }
};

const objectAttachors = {
};

// All object constructors
QmlWeb.constructors = modules.Main;

// Helper. Adds a type to the constructor list
function registerGlobalQmlType(name, type) {
  const constructors = QmlWeb.constructors;

  QmlWeb[type.name] = type;
  constructors[name] = type;
  modules.Main[name] = type;

  applyAttachedObjects(type, name, QmlWeb.QtObject.prototype);

}

// Helper. Register a type to a module
function registerQmlType(options, constructor) {
  if (constructor !== undefined) {
    options.constructor = constructor;
  }

  const descriptor = typeof options === "function" ? {
    module: options.module,
    // TODO ok?   >     <
    name: options.element,
    versions: options.versions,
    baseClass: options.baseClass,
    enums: options.enums,
    signals: options.signals,
    defaultProperty: options.defaultProperty,
    properties: options.properties,
    constructor: options
  } : options;

  descriptor.constructor.$qmlTypeInfo = {
    enums: descriptor.enums,
    signals: descriptor.signals,
    defaultProperty: descriptor.defaultProperty,
    properties: descriptor.properties,
    $name: options.module+"."+options.name
  };

  if (descriptor.global) {
    registerGlobalQmlType(descriptor.name, descriptor.constructor);
  }

  registerModuleClassDescriptor(descriptor);

}

function registerQmlImport(module, name, versions, constructor) {
  const descriptor = {
    module: module,
    name: name,
    versions: versions,
    constructor: constructor
  };
  registerModuleClassDescriptor(descriptor);
}

function registerModuleClassDescriptor(descriptor) {
  const moduleClassDescriptor = {
    name: descriptor.name,
    versions: descriptor.versions,
    constructor: descriptor.constructor
  };

  if (typeof modules[descriptor.module] === "undefined") {
    modules[descriptor.module] = [];
  }
  modules[descriptor.module].push(moduleClassDescriptor);
}

function getConstructor(moduleName, version, name) {
  var ms = modules[moduleName];
  if (typeof ms !== "undefined") {
    for (let i = 0; i < ms.length; ++i) {
      const type = ms[i];
      if (type.name === name && type.versions.test(version)) {
        return type.constructor;
      }
    }
  }
  return null;
}

function getModuleConstructors(moduleName, version) {
  var ms = modules[moduleName];
  const constructors = {};
  if (typeof ms === "undefined") {
    if (!notfound[moduleName]) {
      QmlWeb.warn(`module "${moduleName}" not found`);
      notfound[moduleName] = 1;
    }

    return constructors;
  }
  for (let i = 0; i < ms.length; ++i) {
    const module = ms[i];
    if (module.versions.test(version)) {
      constructors[module.name] = module.constructor;
    }
  }
  return constructors;
}

function applyAttachedObjects(type, name, proto) {
  /*
    http://doc.qt.io/qt-5/qtqml-syntax-objectattributes.html#attached-properties-and-attached-signal-handlers

    Some object treated as Attached. For example, Component.
    In the cycle, we go via constructors and find such objects.
    Then, we set property to object `QtObject.prototype` with name of
    that object, and with specific getter func.
    E.g., we create "someitem.Component" here.
    Later, if somebody will read that property, the getter will be invoked.
    Here all getters are set to `getAttachedObject` only, which is actually
    dedicated for Component attached object.
    The code of `getAttachedObject` checks whether $Component internal
    variable exist, and creates it if it absent.
    Then, `getAttachedObject` adds self "completed" signal to global
    `engine.completedSignals`.
    That is how completed handlers gathered into global list. This list then
    is called by `engine.callCompletedSignals`.

    p.s. At the moment, Repeater and Loader manually call
    `Component.completed` signals on objects they create.
    At the same time, those signals are still pushed to
    `engine.completedSignals` by getAttachedObject.
  */

  if (type.getAttachedObject && !proto.hasOwnProperty(name)) {
    QmlWeb.setupGetter(proto, name, type.getAttachedObject);
    objectAttachors[name] = type;
  }
}

function applyAllAttachedObjects(proto) {

  // TODO gz : add to each proto of prototype chain !
  // so each supertype __proto__ has different "Component" (also different $context ) attached to it :

  // applied to QtQml.QtObject first from registerGlobalQmlType
  // then from classes.construct() when proto has just created

  for(var m in objectAttachors) {
    var mtype = objectAttachors[m];

    applyAttachedObjects(mtype, m, proto);
  }
}


QmlWeb.modules = modules;
QmlWeb.registerGlobalQmlType = registerGlobalQmlType;
QmlWeb.registerQmlType = registerQmlType;
QmlWeb.getConstructor = getConstructor;
QmlWeb.applyAttachedObjects = applyAttachedObjects;
QmlWeb.applyAllAttachedObjects = applyAllAttachedObjects;
