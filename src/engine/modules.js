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
    var: QmlWeb.qmlVariant
  }
};

// All object constructors
QmlWeb.constructors = modules.Main;

const dependants = {};

// Helper. Adds a type to the constructor list
function registerGlobalQmlType(name, type) {
  QmlWeb[type.name] = type;
  QmlWeb.constructors[name] = type;
  modules.Main[name] = type;
}

// Helper. Register a type to a module
function registerQmlType(options, constructor) {
  if (constructor !== undefined) {
    options.constructor = constructor;
  }

  if (typeof options.baseClass === "string") {
    // TODO: Does not support version specification (yet?)
    let baseModule;
    let baseName;
    const dot = options.baseClass.lastIndexOf(".");
    if (dot === -1) {
      baseModule = options.module;
      baseName = options.baseClass;
    } else {
      baseModule = options.baseClass.substring(0, dot);
      baseName = options.baseClass.substring(dot + 1);
    }
    const found = (modules[baseModule] || [])
                    .filter(descr => descr.name === baseName);
    if (found.length > 0) {
      // Ok, we found our base class
      options.baseClass = found[0].constructor;
    } else {
      // Base class not found, delay the loading
      const baseId = [baseModule, baseName].join(".");
      if (!dependants.hasOwnProperty(baseId)) {
        dependants[baseId] = [];
      }
      dependants[baseId].push(options);
      return;
    }
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
    properties: descriptor.properties
  };

  if (descriptor.global) {
    registerGlobalQmlType(descriptor.name, descriptor.constructor);
  }

  registerModuleClassDescriptor(descriptor);

  if (typeof descriptor.baseClass !== "undefined") {
    QmlWeb.inherit(descriptor.constructor, descriptor.baseClass);
  }

  const id = [descriptor.module, descriptor.name].join(".");
  if (dependants.hasOwnProperty(id)) {
    dependants[id].forEach(opt => registerQmlType(opt));
    dependants[id].length = 0;
  }
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
  if (typeof modules[moduleName] !== "undefined") {
    for (let i = 0; i < modules[moduleName].length; ++i) {
      const type = modules[moduleName][i];
      if (type.name === name && type.versions.test(version)) {
        return type.constructor;
      }
    }
  }
  return null;
}

function getModuleConstructors(moduleName, version) {
  const constructors = {};
  if (typeof modules[moduleName] === "undefined") {
    if (!notfound[moduleName]) {
      console.warn(`module "${moduleName}" not found`);
      notfound[moduleName] = 1;
    }

    return constructors;
  }
  for (let i = 0; i < modules[moduleName].length; ++i) {
    const module = modules[moduleName][i];
    if (module.versions.test(version)) {
      constructors[module.name] = module.constructor;
    }
  }
  return constructors;
}


QmlWeb.modules = modules;
QmlWeb.registerGlobalQmlType = registerGlobalQmlType;
QmlWeb.registerQmlType = registerQmlType;
QmlWeb.getConstructor = getConstructor;
