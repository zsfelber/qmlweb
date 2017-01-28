function inherit(constructor, baseClass) {
  const oldProto = constructor.prototype;
  constructor.prototype = Object.create(baseClass.prototype);
  Object.getOwnPropertyNames(oldProto).forEach(prop => {
    constructor.prototype[prop] = oldProto[prop];
  });
  constructor.prototype.constructor = baseClass;
}

function superAndInitMeta(self, meta) {
  const info = meta.super.$qmlTypeInfo || {};
  meta.super = meta.super.prototype.constructor;
  meta.super.call(self, meta);
  initMeta(self, meta, info);
}

function initMeta(self, meta, info) {
  if (!self.$context) self.$context = meta.context;
  if (!self.$context) throw new Error("Instantiantion error, no context ! Either parent object nor metatype provides the 'context' variables' container !");

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
function construct(meta, parent, loaderComponent) {

  const item = constructSuper(meta, parent, loaderComponent);

  // NOTE making a new level of class inheritance :
  item = Object.create(item);

  // Finalize instantiation over supertype item :

  if (typeof item.dom !== "undefined") {
    if (meta.id) {
      item.dom.className += `  ${meta.id}`;
    }
  }

  // id
  if (meta.id) {
    if (item.$context.hasOwnProperty(meta.id)) {
      console.warn("Context entry overriden by Element : "+meta.id+" object:"+item);
    }
    QmlWeb.setupGetterSetter(
      item.$context, meta.id,
      () => item,
      () => {}
    );
    item.$context.$elements[meta.id] = item;
  }

  // Apply properties according to this metatype info
  // (Bindings won't get evaluated, yet)
  QmlWeb.applyProperties(meta, item, item/*, item.$context*/);

  return item;
}

function constructSuper(meta, parent, loaderComponent) {
  if (!loaderComponent) loaderComponent = parent.$component;
  let item;

  // NOTE resolve superclass info:
  var clinfo = QmlWeb.resolveClassImport(meta.$class, loaderComponent);

  if (clinfo.classConstructor) {
    // NOTE class from module/qmldir cache:
    meta.super = clinfo.classConstructor;
    meta.parent = parent;
    item = new clinfo.classConstructor(meta);
    meta.super = undefined;
  } else {

    // NOTE class component from resolved superclass info:
    const component = QmlWeb.resolveComponent(clinfo, loaderComponent);

    if (!component) {
      throw new Error(`${meta.$name?"Toplevel:"+meta.$name:meta.id?"Element:"+meta.id:""}. No constructor found for ${meta.$class}`);
    }

    // NOTE recursive call to initialize the container for supertype  ($createObject -> constuct -> $createObject -> constuct ...) :
    item = component.$createObject(parent);

    if (typeof item.dom !== "undefined") {
      item.dom.className += ` ${clinfo.path[clinfo.path.length - 1]}`;
    }
    // Handle default properties
  }
  return item;
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

  var component = QmlWeb.resolveComponent({clazz, parent, file}, parent?parent.$component:null, true);

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
QmlWeb.superAndInitMeta = superAndInitMeta;
QmlWeb.initMeta = initMeta;
QmlWeb.construct = construct;
QmlWeb.createQmlObject = createQmlObject;
