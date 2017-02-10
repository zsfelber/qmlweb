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

  const constructor = meta._constructor;
  const csontsructor = constructor.prototype.constructor;

  if (csontsructor === Object.prototype) {
    throw new Error("csontsructor === Object.prototype");
  }

  meta._constructor = csontsructor;

  csontsructor.call(self, meta);

  if (meta.context && !self.$context) throw new Error("Instantiantion error, no context !");
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
  const component = QmlWeb.engine.$component;

  // undefined -> 0
  flags |= 0;

  let superitem = constructSuper(meta, parent);

  // means : created by Component.$createObject
  if (flags & QmlWeb.QMLComponentFlags.Element) {
    if (meta !== component.meta || meta.$name!==component.$name  || meta.id!==component.$id
        || meta.context!==component.context || meta.component!==component) {
      throw new Error("Invalid Element construct : "+item);
    }
  } else {
    console.warn("custom  construct (not Component.$createObject) : "+item);
  }

  let item;
  // NOTE making a new level of class inheritance :
  // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
  // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
  // see also Component.constructor
  // see also Object.create in QMLContext.createChild
  if (superitem instanceof QmlWeb.QObject) {
    item = superitem.createChild();

    let nm = component.$name;
    if (/\.qml$/.test(nm)) {
      nm = nm.substring(0, nm.length-4);
    }

    item.$superclass = item.$class;
    item.$class = nm;
    if (flags & QmlWeb.QMLComponentFlags.Nested) {
      item.$classname = "["+nm+"]";
    } else {
      item.$classname = nm;
    }

    var ctx = item.$context = component.context;
    item.$component = component;
    // !!! see QMLBinding
    ctx.$ownerObject = item;

    if (!component.loaderComponent===!(flags & QmlWeb.QMLComponentFlags.Root)) {
      throw new Error("Assertion failed. No Loader + Root or Root + Loader : "+component+"  ctx:"+ctx);
    }

    // Finalize instantiation over supertype item :

    if (typeof item.dom !== "undefined") {
      if (meta.id) {
        item.dom.className += `  ${meta.id}`;
      }
    }

    if (!ctx) {
      throw new Error("No context : "+item);
    }

    // each element into all parent context's elements on the page, by id :
    // There is no ctx for internal modules (not created by Component but its constructor) : then no need to register..
    // (see properties.createProperty. )
    if (meta.id) {
      addElementToPageContexts(item, meta.id, ctx);
    //} else if (flags & QmlWeb.QMLComponentFlags.Nested) {
    //  console.warn("No element id for item  : "+item+"  ctx:"+ctx);
    }

    // Apply properties according to this metatype info
    // (Bindings won't get evaluated, yet)
    QmlWeb.applyProperties(meta, item);

  } else if (superitem instanceof QmlWeb.QMLComponent){
    item = superitem;
  } else {
    throw new Error("construct : Invalid type . "+typeof(superitem));
  }

  return item;
}

function constructSuper(meta, parent) {

  let item;

  // NOTE resolve superclass info:
  var clinfo = QmlWeb.resolveClassImport(meta.$class);

  if (clinfo.classConstructor) {
    // NOTE class from module/qmldir cache:
    meta.parent = parent;
    meta._constructor = clinfo.classConstructor;
    item = new clinfo.classConstructor(meta);
  } else {
    if (meta.id) {
      clinfo.id = meta.id;
    }

    // always super here:
    item = createComponentAndElement(clinfo, parent, QMLComponentFlags.Super);

    if (typeof item.dom !== "undefined") {
      item.dom.className += ` ${clinfo.$path[clinfo.$path.length - 1]}`;
    }
  }

  return item;
}

function createComponentAndElement(meta, parent, flags) {

  // NOTE 1 : class component from meta. meta may be resolved superclass info (Super: from resolveClassImport)
  // or QMLElement directly (Nested : in form {clazz:element_meta}):
  // NOTE 2 : LoadImports only works for Super and not for Nested
  const component = QmlWeb.createComponent(meta, flags |= QmlWeb.QMLComponentFlags.LoadImports);

  if (!component) {
    throw new Error(`${meta.$name?"Toplevel:"+meta.$name:meta.id?"Element:"+meta.id:""}. No constructor found for ${meta.$class}`);
  }

  // NOTE recursive call to initialize the container for supertype  ($createObject -> constuct -> $createObject -> constuct ...) :
  item = component.createObject(parent);

  if (component !== item.$component) {
    throw new Error("Component mismatch : "+component+" vs "+item.$component);
  }
  if (component.flags !== flags) {
    throw new Error("Component flags mismatch : "+flags+" vs "+component.flags);
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
  file = file || "createQmlObject_function";

  var component = QmlWeb.createComponent({clazz, parent, $file:file}, QmlWeb.QMLComponentFlags.LoadImports);

  const obj = component.createObject(parent);

  const QMLOperationState = QmlWeb.QMLOperationState;
  if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
    // We don't call those on first creation, as they will be called
    // by the regular creation-procedures at the right time.
    engine.processPendingOperations();
  }

  return obj;
}



function addElementToPageContexts(item, id, ctx) {

  // register Elements by id in all of parent contexts of the current page

  // see also Component.constructor
  // see also QObject.createChild()->Object.create() in classes.construct
  // see also Object.create in QMLContext.createChild
  // see also QMLProperty.createProperty how element access can be hidden by same name property or alias
  // see also QMLBindingFlags.bindXXX methods how a name is eventually resolved at runtime

  if (ctx.hasOwnProperty(id)) {
    console.warn("Context entry overriden by Element : "+id+" object:"+item);
  }

  // always put nothing but self to inheritable context (only self of elements, but all properties) :
  ctx[id] = item;

  // current page top context $pageElements is inherited :
  if (ctx.$pageElements[id]) {
    throw new Error("Duplicated element id:"+id+" in "+ctx);
  }
  ctx.$pageElements[id] = item;

//  // put it into context.$elements of :
//  // - this QML page or element
//  // - through all nested parent
//  // - until current page top  :
//  for (var ectx = ctx; ; ectx=ectx.loaderContext) {
//    if (ectx.$elements[id]) {
//      throw new Error("Duplicated element id:"+id+" in "+ectx);
//    }

//    QmlWeb.setupGetterSetter(
//      ectx.$elements, id,
//      () => item,
//      () => {},
//      item, true
//    );

//    // ectx is current Page top : exit
//    if (!(ectx.component.flags&QmlWeb.QMLComponentFlags.Nested)) {
//      break;
//    }
//  }
}


QmlWeb.inherit = inherit;
QmlWeb.superAndInitMeta = superAndInitMeta;
QmlWeb.initMeta = initMeta;
QmlWeb.construct = construct;
QmlWeb.createComponentAndElement = createComponentAndElement;
QmlWeb.createQmlObject = createQmlObject;
