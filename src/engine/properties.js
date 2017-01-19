/**
 * Create property getters and setters for object.
 * @param {Object} obj Object for which gsetters will be set
 * @param {String} propName Property name
 * @param {Object} [options] Options that allow finetuning of the property
 */
function createProperty(type, obj, propName, options = {}) {
  const QMLProperty = QmlWeb.QMLProperty;
  const QMLBinding = QmlWeb.QMLBinding;
  const prop = new QMLProperty(type, obj, propName);
  function _set_prop(propName, prop) {
    obj[`${propName}Changed`] = prop.changed;
    obj.$properties[propName] = prop;
    obj.$properties[propName].set(options.initialValue, QMLProperty.ReasonInit);
  }

  let getter;
  let setter;

  if (type === "alias") {
    // TODO
    // 1. Alias must be able to point to prop or id of local object,
    //    eg: property alias q: t
    // 2. Alias may have same name as id it points to: property alias
    //    someid: someid
    // 3. Alias proxy (or property proxy) to proxy prop access to selected
    //    incapsulated object. (think twice).

    // TODO verify,  code moved from outside parse, see "alias"
    // item.$properties[propName].g/set =   ->    g/setter =

    var oldprop = obj.$properties[propName];
    // relink old property (see QML alias specification)
    // alias overrides a same name property but itself still can refer to that
    if (oldprop) {
      _set_prop("__old_"+propName, oldprop);
    }

    _set_prop(propName, prop);


    var objectScope = obj.$properties[propName].objectScope,
        componentScope = obj.$properties[propName].componentScope;
    if (!componentScope) {
      objectScope = obj;
      componentScope = obj.$context;
      obj.$properties[propName].componentScope = componentScope;
      obj.$properties[propName].componentScopeBasePath = componentScope.$basePath;
    }
    var path0 = options.path.slice(0);
    var proplast = path0.pop();

    function _eval_parent() {
      var cur = componentScope;
      var proc = [];
      for(var i in path0) {
        var token = path0[i];
        proc.push(token);
        cur = cur[token];
        if (!cur) {
          console.error("Alias property evaluation error. "+proc.join(".")+" is undefined/null.  Invalid path : "+propName+" -> "+options.path.join("."));
          break;
        }
      }
      return cur;
    }

    getter = function() {
      const targetObj = _eval_parent();
      const val = targetObj[proplast];
      return val;
    };
    setter = function(newVal, reason, _objectScope,
                                       _componentScope) {
      const targetObj = _eval_parent();
      const prop = targetObj.$properties[proplast];
      if (!prop) {
        throw new Error("Cannot set alias property pointing to non-property (so a QML object/element or similar) : "+propName+" -> "+options.path.join("."));
      }
      prop.set(newVal, reason, _objectScope, _componentScope);
    };

    const con = function(prop) {
      const targetObj = _eval_parent();
      if (!targetObj) {
        console.error("qtcore: target object [", path0.join("."),
                      "] not found for alias  "+propName+" -> "+options.path.join("."));
      } else {
        const targetProp = targetObj.$properties[proplast];
        if (!targetProp) {
          console.error(
            "qtcore: target property [", proplast, "] not found for alias "+propName+" -> "+options.path.join(".")
          );
        } else {
          // TODO synchronize cleanup when one of the endpoints is destroyed :
          // TODO re-evaluate alias path when necessary :
          prop.changed = targetProp.changed;
        }
      }
    };
    QmlWeb.engine.pendingOperations.push([con, obj.$properties[propName]]);

  } else {
    _set_prop(propName, prop);

    getter = () => obj.$properties[propName].get();
    if (options.readOnly) {
      setter = function(newVal) {
        if (!obj.$canEditReadOnlyProperties) {
          throw new Error(`property '${propName}' has read only access`);
        }
        obj.$properties[propName].set(newVal, QMLProperty.ReasonUser);
      };
    } else {
      setter = function(newVal) {
        obj.$properties[propName].set(newVal, QMLProperty.ReasonUser);
      };
    }
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
 * @param {Object} objectScope Scope in which properties should be evaluated
 * @param {Object} componentScope Component scope in which properties should be
 *                 evaluated
 */
function applyProperties(metaObject, item, objectScopeIn, componentScope) {
  const QMLProperty = QmlWeb.QMLProperty;
  const objectScope = objectScopeIn || item;
  QmlWeb.executionContext = componentScope;

  if (metaObject.$children && metaObject.$children.length !== 0) {
    if (item.$defaultProperty) {
      item.$properties[item.$defaultProperty].set(
        metaObject.$children, QMLProperty.ReasonInit,
        objectScope, componentScope
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
    const value = metaObject[i];
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
      const signalName = i[2].toLowerCase() + i.slice(3);
      if (connectSignal(item, signalName, value, objectScope, componentScope)) {
        continue;
      }
      if (item.$setCustomSlot) {
        item.$setCustomSlot(signalName, value, objectScope, componentScope);
        continue;
      }
    }

    if (value instanceof Object) {
      if (applyProperty(item, i, value, objectScope, componentScope)) {
        continue;
      }
    }

    if (item.$properties && i in item.$properties) {
      item.$properties[i].set(value, QMLProperty.ReasonInit, objectScope,
                                                             componentScope);
    } else if (i in item) {
      item[i] = value;
    } else if (item.$setCustomData) {
      item.$setCustomData(i, value);
    } else {
      console.warn(
        `Cannot assign to non-existent property "${i}". Ignoring assignment.`
      );
    }
  }
}

function applyProperty(item, i, value, objectScope, componentScope) {
  const QMLProperty = QmlWeb.QMLProperty;

  if (value instanceof QmlWeb.QMLSignalDefinition) {
    item[i] = QmlWeb.Signal.signal(value.parameters);
    if (item.$isComponentRoot) {
      componentScope[i] = item[i];
    }
    return true;
  }

  if (value instanceof QmlWeb.QMLMethod) {
    value.compile();
    item[i] = value.eval(objectScope, componentScope,
      componentScope.$basePath);
    if (item.$isComponentRoot) {
      componentScope[i] = item[i];
    }
    return true;
  }

  if (value instanceof QmlWeb.QMLAliasDefinition) {
    createProperty("alias", item, i, {path:value.path});
    item.$properties[i].objectScope = objectScope;
    item.$properties[i].componentScope = componentScope;
    item.$properties[i].componentScopeBasePath = componentScope.$basePath;
    item.$properties[i].val = value;
    // NOTE getter/setter/target moved to inside createProperty

    return true;
  }

  if (value instanceof QmlWeb.QMLPropertyDefinition) {
    createProperty(value.type, item, i);
    item.$properties[i].set(value.value, QMLProperty.ReasonInit,
                            objectScope, componentScope);
    return true;
  }

  if (item[i] && value instanceof QmlWeb.QMLMetaPropertyGroup) {
    // Apply properties one by one, otherwise apply at once
    applyProperties(value, item[i], objectScope, componentScope);
    return true;
  }

  return false;
}

function connectSignal(item, signalName, value, objectScope, componentScope) {
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
    // Wrap value.src in IIFE in case it includes a "return"
    value.src = `(
      function(${params.join(", ")}) {
        QmlWeb.executionContext = __executionContext;
        QmlWeb.engine.$oldBasePath = QmlWeb.engine.$basePath;
        QmlWeb.engine.$basePath = "${componentScope.$basePath}";
        try {
          (function() {
            ${value.src}
          })();
        } finally {
          QmlWeb.engine.$basePath = QmlWeb.engine.$oldBasePath;
        }
      }
    )`;
    value.isFunction = false;
    value.compile();
  }
  // Don't pass in __basePath argument, as QMLEngine.$basePath is set in the
  // value.src, as we need it set at the time the slot is called.
  const slot = value.eval(objectScope, componentScope);
  item[signalName].connect(item, slot);
  return slot;
}

QmlWeb.createProperty = createProperty;
QmlWeb.applyProperties = applyProperties;
QmlWeb.connectSignal = connectSignal;
