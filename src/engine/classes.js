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
  self.$component = meta.component;
  self.$metaObject = meta.object;

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

  var clinfo = QmlWeb.findClass(meta.object.$class, meta.context);

  if (clinfo.clazzConstructor) {
    meta.super = clinfo.clazzConstructor;
    item = new clinfo.clazzConstructor(meta);
    meta.super = undefined;
  } else {

    /* This will also be set in applyProperties, but needs to be set here
     * for createImpComponent to have the correct context. */
    QmlWeb.executionContext = meta.context;

    const component = createImpComponent(clinfo);

    if (!component) {
      throw new Error(`${meta.object.$name?"Toplevel:"+meta.object.$name:meta.object.id?"Element:"+meta.object.id:""}. No constructor found for ${meta.object.$class}`);
    }

    item = component.$createObject(meta.parent);

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
  item.$context.$importContextId = meta.context.$importContextId;

  // Apply properties (Bindings won't get evaluated, yet)
  QmlWeb.applyProperties(meta.object, item, item/*, item.$context*/);

  return item;
}


function createImpComponent(imp, nocache) {
  if (!imp.clazz) {
    return undefined;
  }
  const engine = QmlWeb.engine;

  const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
  component = new QMLComponent({
    object: imp.clazz,
    parent: imp.parent,
    context: QmlWeb.executionContext,
    $name: imp.clazz.$name,
    $id: imp.clazz.id
  });
  if (QmlWeb.executionContext === QmlWeb.engine.rootContext) {
    throw new Error("Root context at property Qt.createImpComponent : "+imp.file);
  }
  component.$basePath = extractBasePath(imp.file);
  component.$imports = imp.clazz.$imports;
  component.$file = imp.file; // just for debugging

  // TODO gz  undefined -> component.$basePath  from createQmlObject
  QmlWeb.loadImports(imp.clazz.$imports, component.$basePath,
    component.$importContextId);

  if (!nocache) {
    // TODO gz name->file
    engine.components[imp.file] = component;
  }
  return component;
}

function createQmlObject(src, parent, file) {

  const engine = QmlWeb.engine;

  // Returns url resolved relative to the URL of the caller.
  // http://doc.qt.io/qt-5/qml-qtqml-qt.html#resolvedUrl-method
  // in QMLUrl.js
  //var resolvedUrl = url => QmlWeb.qmlUrl(url),

  const clazz = QmlWeb.parseQML(src, file);
  var resolvedUrl = QmlWeb.$resolvePath;
  file = file || /*Qt.*/resolvedUrl("createQmlObject_function");

  var component = createImpComponent({clazz, parent, file}, true);

  const obj = component.createObject(parent);

  const QMLOperationState = QmlWeb.QMLOperationState;
  if (engine.operationState !== QMLOperationState.Init &&
      engine.operationState !== QMLOperationState.Idle) {
    // We don't call those on first creation, as they will be called
    // by the regular creation-procedures at the right time.
    engine.$initializePropertyBindings();

    engine.callCompletedSignals();
  }

  return obj;
}

QmlWeb.inherit = inherit;
QmlWeb.callSuper = callSuper;
QmlWeb.initializeConstr = initializeConstr;
QmlWeb.construct = construct;
QmlWeb.createImpComponent = createImpComponent;
QmlWeb.createQmlObject = createQmlObject;
