const trivialProperties = {context:1, isFromFile:1, component:1, object:1};

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
function createProperty(type, obj, propName, options, namespaceObject) {
  if (!options) options = {};

  if (!namespaceObject) {
    if (!obj.$context) {
      console.warn("properties.createProperty : missing namespaceObject . $context : "+obj);
    }
    namespaceObject = obj;
  }

  const QMLProperty = QmlWeb.QMLProperty;
  const prop = new QMLProperty(type, obj, propName, options);
  function _set_prop(propName, prop, flags) {
    obj[`${propName}Changed`] = prop.changed;
    if (options.hasOwnProperty("initialValue")) {
      prop.set(options.initialValue, flags, namespaceObject);
    } else if (QMLProperty.typeInitialValues.hasOwnProperty(type)) {
      val = QMLProperty.typeInitialValues[type];
      if (val !== undefined) {
        prop.set(val, flags, namespaceObject);
      }
    }
  }

  const getter = function () {
    return prop.get.call(prop);
  };
  const setter = function (value, flags) {
    prop.set.call(prop, value, flags, namespaceObject);
  }
  getter.$owner = prop;
  setter.$owner = prop;

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
    var QMLBinding = QmlWeb.QMLBinding;
    var binding = new QMLBinding(p, proplast, QMLBinding.ImplExpression|QMLBinding.Alias);
    prop.set(binding, QMLProperty.ReasonInitPrivileged, namespaceObject);

    _set_prop(propName, prop, QMLProperty.ReasonInit);

    obj.$properties[propName] = prop;

    QmlWeb.setupGetterSetter(obj, propName, getter, setter, prop);

  } else {
    _set_prop(propName, prop, QMLProperty.ReasonInitPrivileged);

    obj.$properties[propName] = prop;
    obj.$properties_noalias[propName] = prop;

    QmlWeb.setupGetterSetter(obj, propName, getter, setter, prop);
    QmlWeb.setupGetterSetter(obj.$noalias, propName, getter, setter, prop);
  }

  if (obj.$context === QmlWeb.engine.rootContext) {
    throw new Error("Root context at property init : "+this);
  }

  if (!obj.$parent) {
    var item = obj.$context.$elements[propName];
    if (item) {
      //console.warn("Context entry Element overriden by root property : "+type+(prop.type===type?" ":" ("+(prop.type)+") ")+propName+" in obj:"+obj);
      if (type === "alias") {
        QmlWeb.setupGetterSetter(obj.$context.$elementoverloads, propName, getter, setter, prop);
      } else {
        QmlWeb.setupGetterSetter(obj.$context.$elementoverloads, propName, getter, setter, prop);
        QmlWeb.setupGetterSetter(obj.$context.$elementoverloadsnoalias, propName, getter, setter, prop);
      }
    } else {
      QmlWeb.setupGetterSetter(obj.$context, propName, getter, setter, prop);
    }
  }
}

/**
 * Apply properties from metaObject to item.
 * @param {Object} metaObject Source of properties
 * @param {Object} item Target of property apply
 * @param {Object} namespaceObject Scope in which properties should be evaluated
 * @param {Object} namespaceObject.$context Component scope in which properties should be
 *                 evaluated
 */
function applyProperties(metaObject, item, namespaceObject) {
  if (!namespaceObject) {
    throw new Error("properties.applyProperties : missing namespaceObject argument.");
  }
  const QMLProperty = QmlWeb.QMLProperty;
  QmlWeb.executionContext = namespaceObject.$context;

  const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
  if (metaObject.$children && metaObject.$children.length !== 0 && !(item instanceof QMLComponent)) {
    if (item.$defaultProperty) {
      item.$properties[item.$defaultProperty].set(
          metaObject.$children, QMLProperty.ReasonInitPrivileged,
          namespaceObject
        );
    } else {
      throw new Error("Cannot assign to unexistant default property");
    }
  }

  // We purposefully set the default property AFTER using it, in order to only
  // have it applied for instantiations of this component, but not for its
  // internal children
  if (metaObject.$defaultProperty) {
    item.$defaultProperty = metaObject.$defaultProperty;
  }

  for (const i in metaObject) {
    let _task;
    const value = metaObject[i];
    try {
      if (i === "id" || i === "$class") { // keep them
        item[i] = value;
        continue;
      }

      // skip global id's and internal values
      if (i === "id" || i[0] === "$") { // TODO: what? See above.
        continue;
      }

      // slots
      if (i.indexOf("on") === 0 && i.length > 2 && /[A-Z]/.test(i[2])) {
        // TODO binding when whithin group ??
        const signalName = i[2].toLowerCase() + i.slice(3);
        if (item.$setCustomSlot) {
          item.$setCustomSlot(signalName, value, namespaceObject);
          continue;
        } else if (connectSignal(item, signalName, value, namespaceObject)) {
          continue;
        }
      }

      if (value instanceof Object) {
        if (applyProperty(item, i, value, namespaceObject)) {
          continue;
        }
      }

      if (item.$properties && i in item.$properties) {
        item.$properties[i].set(value, QMLProperty.ReasonInitPrivileged, namespaceObject);
      } else if (i in item) {
        item[i] = value;
      } else if (item.$setCustomData) {
        item.$setCustomData(i, value);
      } else if (!trivialProperties[i]) {
        console.warn(
          `Cannot assign to non-existent property "${i}". Ignoring assignment.`
        );
      }
    } catch (err) {
      if (err.ctType === "PendingEvaluation") {
        //console.warn("PendingEvaluation : Cannot apply property bindings (reevaluating at startup) :" + i + "  item:" + item);
      } else {
        console.warn("Cannot apply property bindings  :" + i + "  item:" + item+"  "+err);
      }

      if (QmlWeb.engine.operationState === QmlWeb.QMLOperationState.Idle) {
        throw err;
      }
    }
  }
}

function applyProperty(item, i, value, namespaceObject) {
  const QMLProperty = QmlWeb.QMLProperty;

  if (value instanceof QmlWeb.QMLSignalDefinition) {
    item[i] = QmlWeb.Signal.signal(i, value.parameters);
    if (!item.$parent) {
      namespaceObject.$context[i] = item[i];
    }
    return true;
  } else if (value instanceof QmlWeb.QMLMethod) {
    if (!value.flags&QMLBinding.ImplFunction) {
      throw new Error("Binding/run should be a function : " + value);
    }
    value.compile();
    item[i] = value.run.bind(item);
    //item[i] = value.eval(namespaceObject,
    //  namespaceObject.$context.$basePath);
    if (!item.$parent) {
      namespaceObject.$context[i] = item[i];
    }
    return true;
  } else if (value instanceof QmlWeb.QMLAliasDefinition) {
    createProperty("alias", item, i, {path:value.path, readOnly:value.readonly}, namespaceObject);
    // NOTE getter/setter/target moved to inside createProperty

    return true;
  } else if (value instanceof QmlWeb.QMLPropertyDefinition) {
    createProperty(value.type, item, i, {readOnly:value.readonly, initialValue:value.value}, namespaceObject);
    return true;
  } else if (item[i] && value instanceof QmlWeb.QMLMetaPropertyGroup) {
    // Apply properties one by one, otherwise apply at once
    applyProperties(value, item[i], namespaceObject);
    return true;
  }

  return false;
}

function connectSignal(item, signalName, value, namespaceObject) {
  const _signal = item[signalName];

  if (!_signal) {
    console.warn(`No signal called ${signalName} found!`);
    return undefined;
  } else if (typeof _signal.connect !== "function") {
    console.warn(`${signalName} is not a signal!`);
    return undefined;
  }

  if (!value.compiled) {
    if (value.flags&QMLBinding.ImplFunction) {
      throw new Error("Invalid slot binding, it should not be a function : "+value.src);
    }
  }

  const params = [];
  for (const j in _signal.parameters) {
    params.push(_signal.parameters[j].name);
  }

  params.push("connection");
  var ps = params.join(",");
  var connection;

  if (!value.args || ps!==value.args) {
    value.args = ps;

    try {
      value.flags &= ~QMLBinding.ImplBlock;
      value.flags |= QMLBinding.ImplFunction;
      value.compile();
    } catch (err) {
      if (QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Init) {
        console.warn("connectSignal/slot compile error : "+
                     (err.srcdumpok?" . signal:"+signalName+" :":" :")+err.message+" "+
                     (err.srcdumpok?"srcdump:ok":""+connection));
      }
      err.srcdumpok = 1;
      if (QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Running) {
        throw err;
      }
    }
  }
  // Don't pass in __basePath argument, as QMLEngine.$basePath is set in the
  // value.src, as we need it set at the time the slot is called.
  const slot = value.run(namespaceObject);
  connection = _signal.connect(item, slot);
  connection.arglen = params.length;
  connection.binding = value;
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

  var ctx = QmlWeb.executionContext;
  return {
    in_context : _inf(ctx),
    in_owner : _inf(ctx.$owner),
    in_elementoverloads : _inf(ctx.$elementoverloads),
    in_elementoverloadsnoalias : _inf(ctx.$elementoverloadsnoalias),
  };
}


QmlWeb.formatPath = formatPath;
QmlWeb.createProperty = createProperty;
QmlWeb.applyProperties = applyProperties;
QmlWeb.connectSignal = connectSignal;
QmlWeb.$propertyInfo = $propertyInfo;
