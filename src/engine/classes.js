
function initMeta(self, meta, constructor) {
  const info = constructor.$qmlTypeInfo;
  if (info) {
    self.$modinf = info;
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
        try {
          QmlWeb.createProperty(desc.type, self, name, desc, QMLBindingFlags.ContextNullable);
        } catch (err) {
          if (err instanceof QmlWeb.FatalError) throw err;
          if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)
               || ((QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init) && !err.ctType)) {
            QmlWeb.warn("Cannot create object property from module definition : "+self.$classname+"("+self.$objectId+") . "+name+"  opstate:"+
                         QmlWeb.QMLOperationState.toString(QmlWeb.engine.operationState), err);
          } else if (QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Starting) {
            if (err.ctType === "UninitializedEvaluation")
              QmlWeb.engine.currentPendingOp.warnings.push({loc:"initMeta", type:desc.type, self, name, err})
              ;
            else
              QmlWeb.engine.currentPendingOp.errors.push({loc:"initMeta", type:desc.type, self, name, err});
          }
        }
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

  // undefined -> 0
  flags |= 0;

  let superitem = constructSuper(meta, parent);

  let item;
  // NOTE making a new level of class inheritance :
  // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
  // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
  // see also Component.constructor
  // see also Object.create in QMLContext.createChild
  if (superitem instanceof QmlWeb.QObject) {
    item = superitem.createChild();

    const prevEvalObj = QmlWeb.engine.$evaluatedObj;
    QmlWeb.engine.$evaluatedObj = item;

    try {

      // Finalize instantiation over supertype item :

      //if (typeof item.dom !== "undefined") {
      //  if (meta.id) {
      //    item.dom.className += `  ${meta.id}`;
      //  }
      //}

      item.$component = meta.$component;
      item.$componentCreateFlags = flags;
      if (meta.$component) {
        item.$info = meta.$component.toString();
      }

      item.initializeContext(parent);

      const ctx = item.$context;

      if (!ctx) {
        throw new Error("No context : "+item);
      }

      // We can't finish context initialization
      // until the current construct/constructSuper/component.createObject recursion calling thread
      // returns to the the first non-super component, see also components.js/joinExternalContext
      if (!(flags & QmlWeb.QMLComponentFlags.Super)) {
        ctx.joinExternalContext();
        superitem.$componentCreateFlags |= QmlWeb.QMLComponentFlags.FirstSuper;
        superitem.$context.joinExternalContext();
      }

      QmlWeb.applyAllAttachedObjects(item);

      // each element into all parent context's elements on the page, by id :
      // There is no ctx for internal modules (not created by Component but its constructor) : then no need to register..
      // (see properties.createProperty. )
      if (meta.id) {
        addElementToPageContexts(item, meta.id, ctx);
      //} else if (flags & QmlWeb.QMLComponentFlags.Nested) {
      //  QmlWeb.warn("No element id for item  : "+item+"  ctx:"+ctx);
      }

      // Apply properties according to this metatype info
      // (Bindings won't get evaluated, yet)
      QmlWeb.applyProperties(meta, item);

    } finally {
      QmlWeb.engine.$evaluatedObj = prevEvalObj;
    }

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
  var clinfo = QmlWeb.resolveClassImport(meta.$class, meta.$component);

  if (clinfo.classConstructor) {

    // NOTE internal class, module/qmldir cache:
    meta.parent = parent;
    item = new clinfo.classConstructor(meta);

    item.$info = item.$classname = item.constructor.name;

    if (item.$attachedComponent) {
      // for basic classes like Item, QtObject (and in complex classes' lowest non-prototype __proto__) :
      // It needs this additional activization here (there is another one in QMLComponent.$createObject)
      QObject.pendingComplete(item);
    }

  } else {
    if (meta.id) {
      clinfo.id = meta.id;
    }

    // always super here:
    item = createComponentAndElement(clinfo, parent, QMLComponentFlags.Super, meta.$component);

    //if (typeof item.dom !== "undefined") {
    //  item.dom.className += ` ${clinfo.$path[clinfo.$path.length - 1]}`;
    //}
  }

  return item;
}

function createComponentAndElement(meta, parent, flags, loaderComponent) {

  // NOTE 1 : class component from meta. meta may be resolved superclass info (Super: from resolveClassImport)
  // or QMLElement directly (Nested : in form {clazz:element_meta}):
  // NOTE 2 : LoadImports is only interpreted with Super and not with Nested (so ignored in latter case)
  const component = QmlWeb.createComponent(meta, flags |= QmlWeb.QMLComponentFlags.LoadImports, loaderComponent);

  if (!component) {
    throw new Error(`${meta.$name?"Toplevel:"+meta.$name:meta.id?"Element:"+meta.id:""}. No constructor found for ${meta.$class}`);
  }

  // NOTE recursive call to initialize the container for supertype  ($createObject -> constuct -> $createObject -> constuct ...) :
  item = component.createObject(parent);

  if (component !== item.$component) {
    throw new Error("Component mismatch : "+component+" vs "+item.$component);
  }
  if (component.flags !== flags && component.flags !== (flags|QmlWeb.QMLComponentFlags.FirstSuper)) {
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

  if (id in ctx.$self) {
    throw new QmlWeb.AssertionError("Assertion failed. Context self entry already defined : "+id+" object:"+item);
  }

  // nothing but self :
  ctx.$self[id] = item;

  // current page top context $pageElements is inherited :
  if (id in ctx.$pageElements) {
    throw new Error("Duplicated element id:"+id+" in "+ctx);
  }
  ctx.$pageElements[id] = item;

  if (!ctx.$externalContext.hasOwnProperty(id)) {
    ctx.$externalContext[id] = item;
  }
}


QmlWeb.initMeta = initMeta;
QmlWeb.construct = construct;
QmlWeb.createComponentAndElement = createComponentAndElement;
QmlWeb.createQmlObject = createQmlObject;
