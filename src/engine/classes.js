
function initMeta(self, meta, constructor) {
  const engine = this.engine;
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
          if (!(engine.operationState & QmlWeb.QMLOperationState.BeforeStart)
               || ((engine.operationState & QmlWeb.QMLOperationState.Init) && !err.ctType)) {
            QmlWeb.warn("Cannot create object property from module definition : "+self.$classname+"("+self.$objectId+") . "+name+"  opstate:"+
                         QmlWeb.QMLOperationState.toString(engine.operationState), err);
          } else if (engine.operationState & QmlWeb.QMLOperationState.Starting) {
            if (err.ctType === "UninitializedEvaluation")
              engine.currentPendingOp.warnings.push({loc:"initMeta", type:desc.type, self, name, err})
              ;
            else
              engine.currentPendingOp.errors.push({loc:"initMeta", type:desc.type, self, name, err});
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

  const engine = this.engine;
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

    const prevEvalObj = engine.$evaluatedObj;
    engine.$evaluatedObj = item;

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
      // returns to the the first non-super component, see also components.js/splitExternalContext
      if (flags & QmlWeb.QMLComponentFlags.Super) {
        superitem.$context.splitExternalContext();
      } else {
        superitem.$componentCreateFlags |= QmlWeb.QMLComponentFlags.FirstSuper;
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
      engine.$evaluatedObj = prevEvalObj;
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
  var supermeta = QmlWeb.resolveClassImport(meta.$class, meta.$component);

  if (supermeta.classConstructor) {
    // NOTE 1  internal class, module/qmldir cache:

    supermeta.parent = parent;
    supermeta.$class = meta.$class;
    supermeta.parentmeta = meta;
    // TODO hack
    supermeta.tagName = meta.tagName;
    supermeta.$on = meta.$on;

    item = new supermeta.classConstructor(supermeta);

    item.$info = item.$classname = supermeta.classConstructor.name;

    if (item.$attachedComponent) {
      // for basic classes like Item, QtObject (and in complex classes' lowest non-prototype __proto__) :
      // It needs this additional activization here (there is another one in QMLComponent.$createObject)
      QObject.pendingComplete(item);
    }

  } else {
    // NOTE 2  qml class:

    if (meta.id) {
      supermeta.id = meta.id;
    }

    // always super here:
    item = createComponentAndElement(supermeta, parent, QMLComponentFlags.Super, meta.$component);

    //if (typeof item.dom !== "undefined") {
    //  item.dom.className += ` ${supermeta.$path[supermeta.$path.length - 1]}`;
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

  const engine = this.engine;


  // Returns url resolved relative to the URL of the caller.
  // http://doc.qt.io/qt-5/qml-qtqml-qt.html#resolvedUrl-method
  // in QMLUrl.js
  //var resolvedUrl = url => QmlWeb.$resolvePath(url),

  const clazz = QmlWeb.parseQML(src, file);
  file = file || "createQmlObject_function";

  var component = QmlWeb.createComponent({clazz, $file:file}, QmlWeb.QMLComponentFlags.LoadImports);

  const obj = component.createObject(parent);

  const QMLOperationState = QmlWeb.QMLOperationState;
  if (!(engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
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
