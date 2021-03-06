const trivialProperties = {context:1, component:1, object:1, super:1, parent:1, _constructor:1};

function formatPath(path, path0, first) {
  var p = "";

  if (!path) {
    p = path;
  } else if (typeof path === "string") {
    if (!first && path0) {
      if (/^(\w|\$)+$/.test(path))
          p += "."+path;
      else
          p += '["'+path+'"]';
    } else {
      p = path;
    }
  } else if (path instanceof Array) {
    if (path.length) {
      var p0 = path0 ? path0 : path;
      p = formatPath(path[0], p0, true);
      path.slice(1).forEach(function(token) {
          p += formatPath(token, p0);
      });
      if (path0) {
        p = "[" + p + "]";
      }
    }
  } else {
      throw new Error("Invalid path : "+JSON.stringify(path0)+"  at:"+JSON.stringify(path));
  }
  return p;
}

/**
 * Create property getters and setters for object.
 * @param {Object} obj Object for which gsetters will be set
 * @param {String} propName Property name
 * @param {Object} [options] Options that allow finetuning of the property
 */
function createProperty(type, obj, propName, options, bindingFlags=0) {
  if (!options) options = {};

  const QMLProperty = QmlWeb.QMLProperty;
  const prop = new QMLProperty(type, obj, propName, options);

  const getter = function () {
    return prop.get.call(prop);
  };
  const setter = function (value, flags) {
    prop.set.call(prop, value, flags);
  }
  getter.$owner = prop;
  setter.$owner = prop;

  let flags,binding;
  if (type === "alias") {

    prop.type = options.overrideType ? options.overrideType : "var";

    // TODO
    // 1. Alias must be able to point to prop or id of local object,
    //    eg: property alias q: t
    // 2. Alias may have same name as id it points to: property alias
    //    someid: someid
    // 3. Alias proxy (or property proxy) to proxy prop access to selected
    //    incapsulated object. (think twice).

    var path0 = options.path.slice(0);
    var proplast = path0.pop();

    // we now use separete containers for $noalias
    // alias overrides a same name property but aliases still can refer to the redefined old properties
    // however aliases can't access aliases (directly in same object)
    // (see QML alias specification:
    // http://doc.qt.io/qt-4.8/propertybinding.html#property-aliases)

    var p = formatPath(path0);
    const QMLBinding = QmlWeb.QMLBinding;
    binding = new QMLBinding(p, proplast, QMLBindingFlags.ImplExpression|QMLBindingFlags.Alias|bindingFlags);

    obj.$properties[propName] = prop;
    QmlWeb.setupGetterSetter(obj, propName, getter, setter, prop);

    // NOTE alias + initialValue works too
    flags = QMLPropertyFlags.ReasonInit;

  } else {

    obj.$properties[propName] = prop;
    QmlWeb.setupGetterSetter(obj, propName, getter, setter, prop);

    if (obj.$noalias) {
      obj.$properties_noalias[propName] = prop;
      QmlWeb.setupGetterSetter(obj.$noalias, propName, getter, setter, prop);
    } else if (!obj.constructor.$isGlobal) {
      QmlWeb.error("Invalid object : "+obj+"  $noalias missing.");
    }

    flags = QMLPropertyFlags.ReasonInitPrivileged;
  }

  var ctx = obj.$context;

  // There is no ctx for internal modules (not created by Component but its constructor) : then no need to register..
  // (It's true. We may use QMLBindingFlags.ContextNullable flag to omit context lookup in compilation in the related cases.
  //  Usually we call javascript functions from custom module js classes -> connect(...) codes directly, so this
  //  flag was not used so far. )

  if (ctx) {

    // put property to context
    // ctx is the $component's current loader context (the current QML)
    // (this.proto is superclass, context.proto is containing document's context)
    // see also Component.constructor
    // see also QObject.createChild()->Object.create() in classes.construct
    // see also Object.create in QMLContext.createChild
    // see also classes.construct where $context.$pageElements come from

    // current leaf nested element context (its own supertype hierarchy doesn't matter) :
    //
    // NOTE :
    //
    // see namespace setting in QMLBinding with(...) -s / QObject.$noalias.createChild / components.js.createChild :  we also put alias here.
    // noalias only matters in context in this object's alias bindings to prevent it to access
    // only this object' aliases : not the parent (or inherited/supertype) aliases (at least in my interpretation).
    //
    QmlWeb.setupGetterSetter(ctx.$externalContext, propName, getter, setter, prop);
  }

  obj[`${propName}Changed`] = prop.changed;

  try {
    if (binding) {
      prop.set(binding, QMLPropertyFlags.ReasonInitPrivileged);
    }
  } finally {

    // default values:
    // undefined (not initialized at startup):
    // property ButtonModel buttonModel;
    // property var something;
    // property ButtonModel buttonModel : undefined;

    // initialized at startup:
    // null:
    // property ButtonModel buttonModel : null;
    // 0:
    // property int something;

    if (options.initialValue !== undefined) {
      prop.set(options.initialValue, flags);
    } else if (!binding) {
      prop.set(undefined, flags);
    }
  }

  return prop;
}

/**
 * Apply properties from metaObject to item.
 * @param {Object} metaObject Source of properties
 * @param {Object} item Target of property apply
 *                 evaluated
 */
function applyProperties(metaObject, item) {
  const QMLProperty = QmlWeb.QMLProperty;
  const engine = this;
  var prevEvalObj = QmlWeb.$evaluatedObj;
  QmlWeb.$evaluatedObj = item;

  function _hand_err(err, i) {
    if (err instanceof QmlWeb.FatalError) throw err;
    if (!(engine.operationState & QmlWeb.QMLOperationState.BeforeStart)
         || ((engine.operationState & QmlWeb.QMLOperationState.Init) && !err.ctType)) {
      QmlWeb.warn("Cannot apply property : "+item+" . "+i+"  opstate:"+QmlWeb.QMLOperationState.toString(engine.operationState), err.message);
    } else if (engine.operationState & QmlWeb.QMLOperationState.Starting) {
      if (err.ctType === "UninitializedEvaluation")
        engine.currentPendingOp.warnings.push({loc:"applyProperties", err, item, i})
        ;
      else
        engine.currentPendingOp.errors.push({loc:"applyProperties", err, item, i});
    }
  }

  try {
    const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
    if (metaObject.$children && metaObject.$children.length !== 0 && !(item instanceof QMLComponent)) {
      if (item.$defaultProperty) {
        try {
          item.$properties[item.$defaultProperty].set(
              metaObject.$children, QMLPropertyFlags.ReasonInitPrivileged|QMLPropertyFlags.SetChildren, item
            );

        } catch (err) {
          _hand_err(err, "default:"+item.$defaultProperty);
        }
      } else {
        throw new Error("Cannot assign to unexistant default property  "+item);
      }
    }

    // We purposefully set the default property AFTER using it, in order to only
    // have it applied for instantiations of this component, but not for its supertypes
    // or internals (eg not putting default Element into itself)
    if (metaObject.$defaultProperty) {
      item.$defaultProperty = metaObject.$defaultProperty;
    }

    for (const i in metaObject) {
      let _task;
      const value = metaObject[i];
      try {
        if (i === "id") { // keep id
          item[i] = value;
          continue;
        }

        // skip internal values
        if (i[0] === "$") { // TODO: what? See above.
          continue;
        }

        this.applyProperty(item, i, value);

      } catch (err) {
        _hand_err(err, i);
      }
    }
  } finally {
    QmlWeb.$evaluatedObj = prevEvalObj;
  }
}

function applyProperty(item, i, value) {
  const QMLProperty = QmlWeb.QMLProperty;
  const QMLBinding = QmlWeb.QMLBinding;

  // slots
  if (i.startsWith("on") && i.length > 2 && /[A-Z]/.test(i[2])) {
    // TODO binding when whithin group ??
    const signalName = i[2].toLowerCase() + i.slice(3);
    if (item.$setCustomSlot) {
      item.$setCustomSlot(signalName, value);
      return true;
    } else if (item.connectSignal(item, signalName, value)) {
      return true;
    }
  }

  if (value instanceof Object) {
    if (value instanceof QmlWeb.QMLSignalDefinition) {
      var met = QmlWeb.Signal.signal(i, value.parameters);
      item.$context[i] = met;
      item[i] = met;
      met.owner = item;
      return true;
    } else if (value instanceof QmlWeb.QMLMethod) {
      if (!value.flags&QMLBindingFlags.ImplFunction) {
        throw new Error("Qml method binding should be a function : " + value);
      }
      value.compile();
      // TODO remove unnecessary 'bind's (use classes):
      var met = value.run.bind({binding:value, bindingObj:item});
      item.$context[i] = met;
      item[i] = met;
      met.owner = item;
      return true;
    } else if (value instanceof QmlWeb.QMLAliasDefinition) {
      this.createProperty("alias", item, i, {path:value.path, readOnly:value.readonly});
      // NOTE getter/setter/target moved to inside createProperty

      return true;
    } else if (value instanceof QmlWeb.QMLPropertyDefinition) {
      this.createProperty(value.type, item, i, {readOnly:value.readonly, initialValue:value.value});
      return true;
    } else if (value instanceof QmlWeb.QMLMetaPropertyGroup && i in item) {
      // Apply properties one by one, otherwise apply at once
      this.applyProperties(value, item[i]);
      return true;
    }
  }

  if (item.$properties && i in item.$properties) {
    item.$properties[i].set(value, QMLPropertyFlags.Privileged, item);
    return true;
  } else if (i in item) {
    // TODO protect attached or special properties not overwritten here (Component, anchors)
    item[i] = value;
    return true;
  } else if (item.$setCustomData) {
    item.$setCustomData(i, value);
    return true;
  } else if (!trivialProperties[i]) {
    QmlWeb.warn(
      `Cannot assign to non-existent property  ${item} [ "${i}" ]. Ignoring assignment.  Context:${item.$context}`
    );
  }

  return false;
}

function connectSignal(item, signalName, value) {
  const engine = QmlWeb.getEngine(this.$engine);
  const QMLBinding = QmlWeb.QMLBinding;
  const _signal = item[signalName];

  if (!_signal) {
    QmlWeb.warn(`No signal called ${signalName} found!`);
    return undefined;
  } else if (typeof _signal.connect !== "function") {
    QmlWeb.warn(`${signalName} is not a signal!`);
    return undefined;
  }

  const params = [];
  for (const j in _signal.$signal.params) {
    params.push(_signal.$signal.params[j].name);
  }

  var ps = params.join(",");
  var connection;

  if (ps!==value.args) {
    //QmlWeb.warn("connectSignal  Binding arguments  created or changed : "+value.args+" -> "+ps+"  signal:"+item+" . "+signalName)
    if (value.args) {
      QmlWeb.warn("connectSignal  Binding arguments  changed : "+value.args+" -> "+ps+"  signal:"+item+" . "+signalName);
    }

    try {
      if (value.flags&QMLBindingFlags.ImplFunction) {
        if (!value.compiled) {
          throw new Error("Invalid slot binding, it should not be a function : "+value.src);
        }
      } else {
        if (value.compiled) {
          throw new Error("Invalid compiled slot binding, it should be a function : "+value.src);
        }
        //QmlWeb.warn("connectSignal  convert Binding to function : "+ps);
        //"\n" : maybe comment
        value.src = "{" + value.src + "\n}";
      }

      value.args = ps;
      value.flags &= ~QMLBindingFlags.ImplBlock;
      value.flags |= QMLBindingFlags.ImplFunction;
      value.compile();
    } catch (err) {
      if (!(engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
        QmlWeb.warn("connectSignal/slot compile error : "+
                     (err.srcdumpok?" . signal:"+signalName+" :":" :")+err.message+" "+
                     (err.srcdumpok?"srcdump:ok":""+connection));
      }
      err.srcdumpok = 1;
      throw err;
    }
  }
  connection = _signal.connect(item, value.run);
  connection.thisObj = connection;
  connection.binding = value;
  connection.bindingObj = this;
  return connection;
}


function $propertyInfo(prop) {
  function _inf(root) {
    var result = {};
    result.descriptor = Object.getOwnPropertyDescriptor(root, prop);
    result.get = result.descriptor?result.descriptor.get:0;
    result.property = result.get?result.get.$owner:0;
    result.propertyString = result.property?result.property.toString():0;
    result.object = result.property?result.property.obj:0;
    result.objectString = result.object?result.object.toString():0;
    return result;
  }

  var obj = QmlWeb.$object;
  return {
    in_object : _inf(obj),
    in_context : _inf(obj.$context),
    in_elementoverloads : _inf(obj.$context.$elementoverloads),
    in_elementoverloadsnoalias : _inf(obj.$context.$elementoverloadsnoalias),
  };
}


QmlWeb.formatPath = formatPath;
QMLEngine.prototype.createProperty = createProperty;
QMLEngine.prototype.applyProperties = applyProperties;
QMLEngine.prototype.applyProperty = applyProperty;
QObject.prototype.connectSignal = connectSignal;
QMLEngine.prototype.$propertyInfo = $propertyInfo;
