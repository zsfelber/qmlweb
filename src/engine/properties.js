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
function createProperty(type, obj, propName, options) {
  if (!options) options = {};

  const QMLProperty = QmlWeb.QMLProperty;
  const prop = new QMLProperty(type, obj, propName, options);
  function _set_prop(propName, prop, flags) {
    obj[`${propName}Changed`] = prop.changed;
    if (options.hasOwnProperty("initialValue")) {
      prop.set(options.initialValue, flags);
    } else if (QMLProperty.typeInitialValues.hasOwnProperty(type)) {
      val = QMLProperty.typeInitialValues[type];
      if (val !== undefined) {
        prop.set(val, flags);
      }
    }
  }

  const getter = function () {
    return prop.get.call(prop);
  };
  const setter = function (value, flags) {
    prop.set.call(prop, value, flags);
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
    const QMLBinding = QmlWeb.QMLBinding;
    var binding = new QMLBinding(p, proplast, QMLBindingFlags.ImplExpression|QMLBindingFlags.Alias);
    prop.set(binding, QMLPropertyFlags.ReasonInitPrivileged);

    _set_prop(propName, prop, QMLPropertyFlags.ReasonInit);

    obj.$properties[propName] = prop;
    QmlWeb.setupGetterSetter(obj, propName, getter, setter, prop);

  } else {
    _set_prop(propName, prop, QMLPropertyFlags.ReasonInitPrivileged);

    obj.$properties[propName] = prop;
    QmlWeb.setupGetterSetter(obj, propName, getter, setter, prop);

    if (obj.$noalias) {
      obj.$properties_noalias[propName] = prop;
      QmlWeb.setupGetterSetter(obj.$noalias, propName, getter, setter, prop);
    }
  }


  var ctx = obj.$context;

  // There is no ctx for internal modules (not created by Component but its constructor) : then no need to register..
  // (It's true. We may use QMLBindingFlags.OmitContext flag to omit context lookup in compilation in the related cases.
  //  Usually we call javascript functions from custom module js classes -> connect(...) codes directly, so this
  //  flag was not used so far. )

  if (ctx) {

    // put property to context
    // ctx is the $component's current loader context (the current QML)
    // (this.proto is superclass, context.proto is containing document's context)
    // see also Component.constructor
    // see also QObject.createChild()->Object.create() in classes.construct
    // see also Object.create in QMLContext.createChild
    // see also classes.construct where $context.$elements come from

    // current leaf nested element context (its own supertype hierarchy doesn't matter) :
    //
    // NOTE :
    //
    // see namespace setting in QMLBinding with(...) -s / QObject.$noalias.createChild / components.js.createChild :  we also put alias here.
    // noalias only matters in context in this object's alias bindings to prevent it to access
    // only this object' aliases : not the parent (or inherited/supertype) aliases (at least in my interpretation).
    //
    QmlWeb.setupGetterSetter(ctx, propName, getter, setter, prop);
  }


}

/**
 * Apply properties from metaObject to item.
 * @param {Object} metaObject Source of properties
 * @param {Object} item Target of property apply
 *                 evaluated
 */
function applyProperties(metaObject, item) {
  const QMLProperty = QmlWeb.QMLProperty;
  var prevComponent = QmlWeb.engine.$component;
  QmlWeb.engine.$component = item.$component;

  function _hand_err(err, i) {
    if (err.ctType === "PendingEvaluation") {
      //console.warn("PendingEvaluation : Cannot apply property bindings (reevaluating at startup) :" + i + "  item:" + item);
    } else {
      console.warn("Cannot apply property bindings : "+item+" . "+i+"  Context:"+item.$context+"  "+err.message+"  opstate:"+QmlWeb.QMLOperationState.toString(QmlWeb.engine.operationState));
    }

    if (QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Starting) {
      throw err;
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

        applyProperty(item, i, value);

      } catch (err) {
        _hand_err(err, i);
      }
    }
  } finally {
    QmlWeb.engine.$component = prevComponent;
  }
}

function applyProperty(item, i, value) {
  const QMLProperty = QmlWeb.QMLProperty;
  const QMLBinding = QmlWeb.QMLBinding;

  // slots
  if (i.indexOf("on") === 0 && i.length > 2 && /[A-Z]/.test(i[2])) {
    // TODO binding when whithin group ??
    const signalName = i[2].toLowerCase() + i.slice(3);
    if (item.$setCustomSlot) {
      item.$setCustomSlot(signalName, value);
      return true;
    } else if (connectSignal.call(item, item, signalName, value)) {
      return true;
    }
  }

  if (value instanceof Object) {
    if (value instanceof QmlWeb.QMLSignalDefinition) {
      var met = QmlWeb.Signal.signal(i, value.parameters);0
      item.$context[i] = met;
      item[i] = met;
      met.owner = item;
      return true;
    } else if (value instanceof QmlWeb.QMLMethod) {
      if (!value.flags&QMLBindingFlags.ImplFunction) {
        throw new Error("Qml method binding should be a function : " + value);
      }
      value.compile();
      var met = value.run.bind({binding:value, bindingObj:item});
      item.$context[i] = met;
      item[i] = met;
      met.owner = item;
      return true;
    } else if (value instanceof QmlWeb.QMLAliasDefinition) {
      createProperty("alias", item, i, {path:value.path, readOnly:value.readonly});
      // NOTE getter/setter/target moved to inside createProperty

      return true;
    } else if (value instanceof QmlWeb.QMLPropertyDefinition) {
      createProperty(value.type, item, i, {readOnly:value.readonly, initialValue:value.value});
      return true;
    } else if (item[i] && value instanceof QmlWeb.QMLMetaPropertyGroup) {
      // Apply properties one by one, otherwise apply at once
      applyProperties(value, item[i]);
      return true;
    }
  }

  if (item.$properties && i in item.$properties) {
    item.$properties[i].set(value, QMLPropertyFlags.ReasonInitPrivileged);
    return true;
  } else if (i in item) {
    item[i] = value;
    return true;
  } else if (item.$setCustomData) {
    item.$setCustomData(i, value);
    return true;
  } else if (!trivialProperties[i]) {
    console.warn(
      `Cannot assign to non-existent property  ${item} [ "${i}" ]. Ignoring assignment.  Context:${item.$context}`
    );
  }

  return false;
}

function connectSignal(item, signalName, value) {
  const QMLBinding = QmlWeb.QMLBinding;
  const _signal = item[signalName];

  if (!_signal) {
    console.warn(`No signal called ${signalName} found!`);
    return undefined;
  } else if (typeof _signal.connect !== "function") {
    console.warn(`${signalName} is not a signal!`);
    return undefined;
  }

  const params = [];
  for (const j in _signal.parameters) {
    params.push(_signal.parameters[j].name);
  }

  var ps = params.join(",");
  var connection;

  if (ps!==value.args) {
    //console.warn("connectSignal  Binding arguments  created or changed : "+value.args+" -> "+ps+"  signal:"+item+" . "+signalName)
    if (value.args) {
      console.warn("connectSignal  Binding arguments  changed : "+value.args+" -> "+ps+"  signal:"+item+" . "+signalName);
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
        //console.warn("connectSignal  convert Binding to function : "+ps);
        value.src = "{" + value.src + "}";
      }

      value.args = ps;
      value.flags &= ~QMLBindingFlags.ImplBlock;
      value.flags |= QMLBindingFlags.ImplFunction;
      value.compile();
    } catch (err) {
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
        console.warn("connectSignal/slot compile error : "+
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
QmlWeb.createProperty = createProperty;
QmlWeb.applyProperties = applyProperties;
QmlWeb.connectSignal = connectSignal;
QmlWeb.$propertyInfo = $propertyInfo;
