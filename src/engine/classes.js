function inherit(constructor, baseClass) {
  const oldProto = constructor.prototype;
  constructor.prototype = Object.create(baseClass.prototype);
  Object.getOwnPropertyNames(oldProto).forEach(prop => {
    constructor.prototype[prop] = oldProto[prop];
  });
  constructor.prototype.constructor = baseClass;
}

function superAndInitMeta(self, meta) {

  // NOTE
  // meta._constructor : this class
  // self.constructor : superclass

  var constructor = meta._constructor;
  meta._constructor = self.constructor;
  self.constructor.call(self, meta);
  if (!self.$context) throw new Error("Instantiantion error, no context !");
  initMeta(self, meta, constructor);
}

function initMeta(self, meta, constructor) {
  const info = constructor.$qmlTypeInfo;
  if (info) {
    self.$info = info;
    self.$classname = info.$name;
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
  } else {
    throw new Error("initMeta : No type info : "+self);
  }
}

/**
 * QML Object constructor.
 * @param {Object} meta Meta information about the object and the creation
 *                      context
 * @return {Object} New qml object
 */
function construct(meta, parent, flags) {
  const loaderComponent = QmlWeb.engine.$component;
  const superitem = constructSuper(meta, parent, flags);

  // NOTE making a new level of class inheritance :
  // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
  // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
  // see also Component.constructor
  // see also Object.create in QMLContext.createChild
  const item = superitem.createChild();
  item.$classname = loaderComponent.$name;

  // Finalize instantiation over supertype item :

  if (typeof item.dom !== "undefined") {
    if (meta.id) {
      item.dom.className += `  ${meta.id}`;
    }
  }

  var ctx = item.$context;

  var currentTopComponent = ctx.component;
  if (currentTopComponent.nestedLevel) throw new Error("Assertion failed. Top component should not be nested.");

  var topctx = currentTopComponent.context;
  if (ctx !== topctx) throw new Error("Assertion failed. Each component should share the current top loader context.");


  // id
  // see also Component.constructor
  // see also QObject.createChild()->Object.create() in classes.construct
  // see also Object.create in QMLContext.createChild
  // see also QMLProperty.createProperty how element access can be hidden by same name property or alias
  // see also QMLBinding.bindXXX methods how a name is eventually resolved at runtime
  if (meta.id) {
    if (ctx.hasOwnProperty(meta.id)) {
      console.warn("Context entry overriden by Element : "+meta.id+" object:"+item);
    }
    QmlWeb.setupGetterSetter(
      ctx, meta.id,
      () => item,
      () => {}
    );
    item.$elements[meta.id] = item;
  }

  // Apply properties according to this metatype info
  // (Bindings won't get evaluated, yet)
  QmlWeb.applyProperties(meta, item);

  return item;
}

function constructSuper(meta, parent, flags) {

  let item;

  // NOTE resolve superclass info:
  var clinfo = QmlWeb.resolveClassImport(meta.$class);

  if (clinfo.classConstructor) {
    // NOTE class from module/qmldir cache:
    meta.parent = parent;
    meta._constructor = clinfo.classConstructor;
    item = new clinfo.classConstructor(meta);
  } else {

    // NOTE class component from resolved superclass info:
    const component = QmlWeb.resolveComponent(clinfo, flags);

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

  var component = QmlWeb.resolveComponent({clazz, parent, file}, parent?parent.$component:null, QmlWeb.QMLComponent.Nested);

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
