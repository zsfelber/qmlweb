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
  const component = QmlWeb.engine.$component;

  if (flags & QmlWeb.QMLComponent.Nested) {
  } else {
    flags |= QmlWeb.QMLComponent.Super;
  }

  //if ( (flags & QmlWeb.QMLComonent.Element) && (component.flags & QmlWeb.QMLComponent.Nested) ) {

  //  meta = QmlWeb.helpers.mergeObjects(meta);

    // NOTE on the top of a Nested Component's loader hierarchy, we have to insert 1 extra level of Components into
    // chains, changing $class from the "superclass" to the current again (but with Super flag):
    // No infinite loop, because component.flags is not Nested the next time  :
  //  meta.$superclass = meta.$class;
  //  delete meta.$class;
  //}

  const superitem = constructSuperOrNested(meta, parent, flags);

  // NOTE making a new level of class inheritance :
  // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
  // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
  // see also Component.constructor
  // see also Object.create in QMLContext.createChild
  const item = superitem.createChild();

  // means : created by Component.$createObject
  if (flags & QmlWeb.QMLComponent.Element) {
    if (meta !== component.meta || meta.$name!==component.$name  || meta.$id!==component.$id
        || meta.context!==component.context || meta.component!==component) {
      throw new Error("Invalid Element construct : "+item);
    }
    item.$classname = component.$name;
    item.$context = component.context;
    item.$component = component;
  } else if (flags & QmlWeb.QMLComponent.Super) {
    console.warn("custom Super construct (not Component.$createObject) : "+item);
  }

  if ((flags & QmlWeb.QMLComponent.Root) || (component.topComponent.flags & QmlWeb.QMLComponent.Root)) {
    if (component.loaderComponent) throw new Error("component.loaderComponent should not be present here : "+item);
  } else if (!component.loaderComponent) {
    throw new Error("Assertion failed. No loader : "+component);
  } else if (flags&QmlWeb.QMLComponent.Super) {
    if (item.$component !==  component) {
      throw new Error("Assertion failed. $component differs from that in stack : "+item.$component+" ===  "+component);
    }
  }

  // Finalize instantiation over supertype item :

  if (typeof item.dom !== "undefined") {
    if (meta.id) {
      item.dom.className += `  ${meta.id}`;
    }
  }

  var ctx = item.$context;

  // each element into parent context, by id :
  if (flags & QmlWeb.QMLComponent.Nested) {
    if (meta.id) {
      registerElementInParent(item, meta.id);
    } else {
      console.warn("No element id for item  : "+item+"  ctx:"+ctx.$info);
    }
  }

  // Apply properties according to this metatype info
  // (Bindings won't get evaluated, yet)
  QmlWeb.applyProperties(meta, item);

  // always put self into context, by internal id :

  if (item.id) {

    putElement(item, item.id, ctx);;

  } else {
    console.warn("No id of item for self : "+item+"  ctx:"+ctx.$info);
  }

  return item;
}

function constructSuperOrNested(meta, parent, flags) {

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

    // NOTE class component from resolved superclass info:
    const component = QmlWeb.resolveComponent(clinfo, flags);

    if (!component) {
      throw new Error(`${meta.$name?"Toplevel:"+meta.$name:meta.id?"Element:"+meta.id:""}. No constructor found for ${meta.$class}`);
    }


    // NOTE recursive call to initialize the container for supertype  ($createObject -> constuct -> $createObject -> constuct ...) :
    item = component.$createObject(parent);
    if (component !== item.$component) {
      throw new Error("Component mismatch : "+component+" vs "+item.$component);
    }
    if (component.flags !== flags) {
      throw new Error("Component flags mismatch : "+flags+" vs "+component.flags);
    }

    if (typeof item.dom !== "undefined") {
      item.dom.className += ` ${clinfo.path[clinfo.path.length - 1]}`;
    }
    // Handle default properties
  }
  return item;
}


function registerElementInParent(item, id) {
  var ctx = item.$context.loaderContext;
  var cmp = item.$component.loaderComponent;
  if (cmp.context !== ctx) {
    throw new Error("Assertion failed. Component integrity error.  "+cmp);
  }

  var chkctx = item.$parent.$context;
  var chkcmp = item.$parent.$component;
  if (chkctx !== ctx || chkcmp !== cmp) {
    throw new Error("Assertion failed. Component context integrity error.  "+ctx);
  }

  var topctx = ctx.topContext;
  var topcmp = cmp.topComponent;
  if (!topctx || topctx.component !== topcmp) {
    throw new Error("Assertion failed. Component integrity error.  "+cmp+"  "+ctx);
  }
  if (!topcmp || topcmp.context !== topctx) {
    throw new Error("Assertion failed. Component integrity error.  "+cmp+"  "+ctx);
  }

  if (cmp.flags & (QmlWeb.QMLComponent.Nested|QmlWeb.QMLComponent.Root)) {

    // This means : we are in the loader component directly, and not in a super QML of current nested (or root) element :

    if (ctx !== topctx) {
      throw new Error("Assertion failed. Invalid context:"+ctx.$info+" === "+(topctx?topctx.$info:"<null>"));
    }
  } else {
    if (ctx === topctx) {
      throw new Error("Assertion failed. Invalid context:"+ctx.$info+" !== "+(topctx?topctx.$info:"<null>"));
    }
    if (!topctx || topctx.__proto__ !== ctx.__proto__) {
      throw new Error("Assertion failed. Each component should fork from the current top loader context.");
    }
  }

  putElement(item, id, ctx);
}

function putElement(item, id, ctx) {

  // id
  // see also Component.constructor
  // see also QObject.createChild()->Object.create() in classes.construct
  // see also Object.create in QMLContext.createChild
  // see also QMLProperty.createProperty how element access can be hidden by same name property or alias
  // see also QMLBinding.bindXXX methods how a name is eventually resolved at runtime

  if (ctx.hasOwnProperty(id)) {
    console.warn("Context entry overriden by Element : "+id+" object:"+item);
  }

  if (ctx.$elements[id]) {
    throw new Error("Duplicated element id:"+id+" in "+ctx.$info);
  }

  QmlWeb.setupGetterSetter(
    ctx, id,
    () => item,
    () => {}
  );
  QmlWeb.setupGetterSetter(
    ctx.$noalias, id,
    () => item,
    () => {}
  );
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
