QmlWeb.executionContext = null;
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

const perImportContextConstructors = {};
let importContextIds = 0;

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
    inherit(descriptor.constructor, descriptor.baseClass);
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

function preloadImports(component, imports) {
  if (component.importContextId) {
    throw new Error("Component imports already loaded. "+this.$context.$basePath+" "+component.$file+"  importContextId:"+component.importContextId);
  }

  const mergeObjects = QmlWeb.helpers.mergeObjects;
  let constructors = mergeObjects(modules.Main);
  if (imports.filter(row => row[1] === "QtQml").length === 0 &&
      imports.filter(row => row[1] === "QtQuick").length === 1) {
    imports.push(["qmlimport", "QtQml", 2, "", true]);
  }
  for (let i = 0; i < imports.length; ++i) {
    const [, moduleName, moduleVersion, moduleAlias] = imports[i];
    if (!moduleVersion) {
      continue;
    }
    const versionString = moduleVersion % 1 === 0 ?
                            moduleVersion.toFixed(1) :
                            moduleVersion.toString();
    const moduleConstructors = getModuleConstructors(moduleName, versionString);

    if (moduleAlias) {
      constructors[moduleAlias] = mergeObjects(
        constructors[moduleAlias],
        moduleConstructors
      );
    } else {
      constructors = mergeObjects(constructors, moduleConstructors);
    }
  }
  component.importContextId = ++importContextIds;
  perImportContextConstructors[component.importContextId] = constructors;
  QmlWeb.constructors = constructors; // TODO: why do we need this?
}

function inherit(constructor, baseClass) {
  const oldProto = constructor.prototype;
  constructor.prototype = Object.create(baseClass.prototype);
  Object.getOwnPropertyNames(oldProto).forEach(prop => {
    constructor.prototype[prop] = oldProto[prop];
  });
  constructor.prototype.constructor = baseClass;
}

function callSuper(self, meta) {
  const info = meta.super.$qmlTypeInfo || {};
  meta.super = meta.super.prototype.constructor;
  meta.super.call(self, meta);
  initializeConstr(self, meta, info);
}

function initializeConstr(self, meta, info) {
  self.$isComponentRoot = meta.isComponentRoot;
  self.$context = meta.context;

  info = info || meta.super.$qmlTypeInfo || {};
  if (info.enums) {
    // TODO: not exported to the whole file scope yet
    for (var name in info.enums) {
      self[name] = info.enums[name];

      if (!global[name]) {
        global[name] = self[name]; // HACK
      }
    }
  }
  if (info.properties) {
    for (var name in info.properties) {
      let desc = info.properties[name];
      if (typeof desc === "string") {
        desc = { type: desc };
      }
      QmlWeb.createProperty(desc.type, self, name, desc);
    }
  }
  if (info.signals) {
    for (var name in info.signals) {
      const params = info.signals[name];
      self[name] = QmlWeb.Signal.signal(name, params);
    }
  }
  if (info.defaultProperty) {
    self.$defaultProperty = info.defaultProperty;
  }
}

/**
 * QML Object constructor.
 * @param {Object} meta Meta information about the object and the creation
 *                      context
 * @return {Object} New qml object
 */
function construct(meta) {
  let item;

  var clinfo = QmlWeb.engine.findClass(meta.object.$class, meta.context);

  if (clinfo.clazzConstructor) {
    meta.super = clinfo.clazzConstructor;
    item = new clinfo.clazzConstructor(meta);
    meta.super = undefined;

    // TODO gz
    item.$metaObject = meta.object;
  } else {

    const component = QmlWeb.Qt.createImpComponent(clinfo);

    if (!component) {
      throw new Error(`${meta.object.$name?"Toplevel:"+meta.object.$name:meta.object.id?"Element:"+meta.object.id:""}. No constructor found for ${meta.object.$class}`);
    }

    item = component.$createObject(meta.parent);

    // TODO gz
    item.$component = component;
    item.$metaObject = meta.object;

    if (typeof item.dom !== "undefined") {
      item.dom.className += ` ${clinfo.classComponents[clinfo.classComponents.length - 1]}`;
      if (meta.object.id) {
        item.dom.className += `  ${meta.object.id}`;
      }
    }
    // Handle default properties
  }

  // id
  if (meta.object.id) {
    if (meta.context.hasOwnProperty(meta.object.id)) {
      console.warn("Context entry overriden by Element : "+meta.object.id+" object:"+item);
    }
    QmlWeb.setupGetterSetter(
      meta.context, meta.object.id,
      () => item,
      () => {}
    );
    meta.context.$elements[meta.object.id] = item;
  }

  // keep path in item for probale use it later in Qt.resolvedUrl
  item.$context.$basePath = QmlWeb.engine.$basePath; //gut

  // We don't want to use the item's scope, but this Component's imports
  item.$context.importContextId = meta.context.importContextId;

  // Apply properties (Bindings won't get evaluated, yet)
  QmlWeb.applyProperties(meta.object, item, item/*, item.$context*/);

  return item;
}

QmlWeb.modules = modules;
QmlWeb.registerGlobalQmlType = registerGlobalQmlType;
QmlWeb.registerQmlType = registerQmlType;
QmlWeb.getConstructor = getConstructor;
QmlWeb.preloadImports = preloadImports;
QmlWeb.callSuper = callSuper;
QmlWeb.initializeConstr = initializeConstr;
QmlWeb.construct = construct;
QmlWeb.perImportContextConstructors = perImportContextConstructors;
