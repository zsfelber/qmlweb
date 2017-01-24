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
      throw new Error("properties.createProperty : missing namespaceObject argument.");
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

    // we now use separete containers for $aliases and $properties
    // alias overrides a same name property but aliases still can refer to the redefined old properties
    // however aliases can't access aliases (directly in same object)
    // (see QML alias specification:
    // http://doc.qt.io/qt-4.8/propertybinding.html#property-aliases)

    var p = path0.join(".");
    var QMLBiding = QmlWeb.QMLBinding;
    var binding = new QMLBinding(p, proplast, QMLBinding.ImplExpression|QMLBinding.Alias);
    prop.set(binding, QMLProperty.ReasonInitPrivileged, namespaceObject);

    _set_prop(propName, prop, QMLProperty.ReasonInit);
    obj.$aliases[propName] = prop;
    obj.$properties_aliases[propName] = prop;

  } else {
    _set_prop(propName, prop, QMLProperty.ReasonInitPrivileged);
    obj.$properties[propName] = prop;
    obj.$properties_aliases[propName] = prop;
  }

  var getter = function () {
    return prop.get.call(prop);
  };
  var setter = function (value, flags) {
    prop.set.call(prop, value, flags, namespaceObject);
  }

  QmlWeb.setupGetterSetter(obj, propName, getter, setter);
  if (obj.$isComponentRoot) {
    QmlWeb.setupGetterSetter(obj.$context, propName, getter, setter);
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
      item.$properties_aliases[item.$defaultProperty].set(
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
        if (connectSignal(item, signalName, value, namespaceObject)) {
          continue;
        }
        if (item.$setCustomSlot) {
          item.$setCustomSlot(signalName, value, namespaceObject);
          continue;
        }
      }

      if (value instanceof Object) {
        if (applyProperty(item, i, value, namespaceObject)) {
          continue;
        }
      }

      if (item.$properties_aliases && i in item.$properties_aliases) {
        item.$properties_aliases[i].set(value, QMLProperty.ReasonInitPrivileged, namespaceObject);
      } else if (i in item) {
        item[i] = value;
      } else if (item.$setCustomData) {
        item.$setCustomData(i, value);
      } else {
        console.warn(
          `Cannot assign to non-existent property "${i}". Ignoring assignment.`
        );
      }
    } catch (err) {
      if (err.ctType === "PendingEvaluation") {
        console.warn("PendingEvaluation : Property apply still pending :" + i + "  item:" + item);
      } else {
        throw err;
      }
    }
  }
}

function applyProperty(item, i, value, namespaceObject) {
  const QMLProperty = QmlWeb.QMLProperty;

  if (value instanceof QmlWeb.QMLSignalDefinition) {
    item[i] = QmlWeb.Signal.signal(i, value.parameters);
    if (item.$isComponentRoot) {
      namespaceObject.$context[i] = item[i];
    }
    return true;
  } else if (value instanceof QmlWeb.QMLMethod) {
    value.compile();
    item[i] = value.eval(namespaceObject,
      namespaceObject.$context.$basePath);
    if (item.$isComponentRoot) {
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
  if (!item[signalName]) {
    console.warn(`No signal called ${signalName} found!`);
    return undefined;
  } else if (typeof item[signalName].connect !== "function") {
    console.warn(`${signalName} is not a signal!`);
    return undefined;
  }

  if (!value.compiled) {
    const params = [];
    for (const j in item[signalName].parameters) {
      params.push(item[signalName].parameters[j].name);
    }
    if (value.implementMode===QMLBinding.ImplFunction) {
      throw new Error("Invalid slot binding, it should not be a function : "+value.src);
    }
    // Wrap value.src in IIFE in case it includes a "return"
    // NOTE removed because it kills "this" :
    // (function() {
    //   ${value.src}
    // })();
    value.src = `(${params.join(", ")}) {
        QmlWeb.executionContext = __executionContext;
        QmlWeb.engine.$oldBasePath = QmlWeb.engine.$basePath;
        QmlWeb.engine.$basePath = "${namespaceObject.$context.$basePath}";
        try {
          ${value.src}
        } finally {
          QmlWeb.engine.$basePath = QmlWeb.engine.$oldBasePath;
        }
      }`;
    value.implementMode = QMLBinding.ImplFunction;
    value.compile();
  }
  // Don't pass in __basePath argument, as QMLEngine.$basePath is set in the
  // value.src, as we need it set at the time the slot is called.
  const slot = value.eval(namespaceObject);
  var connection = item[signalName].connect(item, slot);
  return connection;
}

QmlWeb.createProperty = createProperty;
QmlWeb.applyProperties = applyProperties;
QmlWeb.connectSignal = connectSignal;
