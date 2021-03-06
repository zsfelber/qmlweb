/* @license

MIT License

Copyright (c) 2011 Lauri Paimen <lauri@paimen.info>
Copyright (c) 2013 Anton Kreuzkamp <akreuzkamp@web.de>
Copyright (c) 2016 QmlWeb contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

class QMLMethod extends QmlWeb.QMLBinding {
  constructor(src) {
    super(src, undefined, QMLBindingFlags.ImplFunction);
    Object.defineProperty(this, "serializedTypeId", {
      value: "m",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
}

class QtBindingDefinition {
  constructor(get, set, flags) {
    this.get = get;
    this.set = set;
    this.flags = flags;
    Object.defineProperty(this, "serializedTypeId", {
      value: "q",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
}

/**
 * Create an object representing a QML property definition.
 * @param {String} type The type of the property
 * @param {Array} value The default value of the property
 * @return {Object} Object representing the defintion
 */
class QMLPropertyDefinition {
  constructor(type, value, readonly, templ) {
    this.type = type;
    this.value = value;
    this.readonly = readonly;
    this.templ = templ;
    Object.defineProperty(this, "serializedTypeId", {
      value: "p",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
}

class QMLAliasDefinition {
  constructor(path, readonly) {
    this.path = path;
    this.readonly = readonly;
    Object.defineProperty(this, "serializedTypeId", {
      value: "a",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
}

/**
 * Create an object representing a QML signal definition.
 * @param {Array} params The parameters the signal ships
 * @return {Object} Object representing the defintion
 */
class QMLSignalDefinition {
  constructor(params) {
    this.parameters = params;
    Object.defineProperty(this, "serializedTypeId", {
      value: "s",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
}

/**
 * Create an object representing a group of QML properties (like anchors).
 * @return {Object} Object representing the group
 */
class QMLMetaPropertyGroup {
  constructor() {
    Object.defineProperty(this, "serializedTypeId", {
      value: "g",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

}

/**
 * Create an object representing a QML element.
 * @param {String} type Type of the element
 * @param {String} onProp Name of the property specified with the "on" keyword
 */
class QMLMetaElement {
  constructor(type, onProp) {
    this.$class = type;
    this.$children = [];
    this.$on = onProp;
    Object.defineProperty(this, "serializedTypeId", {
      value: "e",
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
}

var s_objectIds = 0;
var undefinedMarker = {};

function ssplice(str, startIndex, length, insertString){
  return str.substring(0,startIndex) + insertString + str.substring(startIndex + length);
}

function serializeObj(object, path, backrefs, dups, pos) {
  var top = !path;
  if (top) {
    path = [];
    backrefs = {};
    dups = {};
    pos = 0;
  }
  var pos0 = pos;

  if (!object) {
    if (typeof object === "string") {
      return '""';
    } else if (object===undefinedMarker) {
      return undefined;
    } else {
      return object;
    }
  }

  var id = object.s_objectId;
  if (!id) object.s_objectId = id = ++s_objectIds;
  var ref = backrefs[id];
  if (ref) {
    dups[id] = ref;
    return "__"+id;
  } else {
    backrefs[id] = ref = {pos:pos, length:0};
  }

  var result;

  if (object instanceof Array) {
    result = "[";
    var l0 = result.length;

    var i = 0;
    for (var propname in object) {
      if (propname === "serializedTypeId" || propname === "s_objectId") continue;
      var prop = object[propname];
      path.push([i]);
      var value = serializeObj(prop, path, backrefs, dups, pos);
      if (value !== undefined) {
        result += value+", ";
      } else {
        result += "_, ";
      }

      pos = pos0 + result.length;
      path.pop();
      ++i;
    }
    if (result.length>l0) {
      result = result.substring(0, result.length-2);
    }
    result += "]";
  } else if (object instanceof Object) {
    //if (object.toJSON) {
    //  return object.toJSON();
    //} else
    if (object.serializedTypeId) {
      result = object.serializedTypeId+"({";
    } else {
      result = "{";
    }
    var l0 = result.length;

    for (var propname in object) {
      if (propname === "serializedTypeId" || propname === "s_objectId") continue;
      var prop = object[propname];
      if (object instanceof QMLMetaElement && "$children"===propname && prop instanceof Array && !prop.length) continue;
      if (top && "$class"===propname) continue;
      if (object instanceof QMLSignalDefinition && "parameters"===propname && prop instanceof Array && !prop.length) continue;
      if (object instanceof QMLBinding && ["$objectId","$bindingId"].indexOf(propname)>=0) continue;
      if ("flags"===propname) {
        if (object instanceof QMLMethod) continue;
        else if (object instanceof QMLBinding && !prop) continue;
      }

      //if ((object instanceof QMLMethod) ||
      //  (object instanceof QMLPropertyDefinition) ||
      //  (object instanceof QMLAliasDefinition) ||
      //  (object instanceof QMLSignalDefinition) ||
      //  (object instanceof QMLMetaPropertyGroup) ||
      //  (object instanceof QMLMetaElement)) {
      //
      //}

      path.push(propname);
      var lab;
      if (/^\w+$/.test(propname)) {
        lab = propname+" : ";
      } else {
        lab = JSON.stringify(propname)+" : ";
      }

      pos += lab.length;
      var value = serializeObj(prop, path, backrefs, dups, pos);
      if (value !== undefined) {
        result += lab + value + ", ";
      }
      pos = pos0 + result.length;
      path.pop();
    }
    if (result.length>l0) {
      result = result.substring(0, result.length-2);
    }

    if (object.serializedTypeId) {
      result += "})";
    } else {
      result += "}";
    }
  } else if (typeof object === "string") {
    result = JSON.stringify(object);
  } else if (object.toString){
    result = object.toString();
  } else {
    result = "/*json:*/"+JSON.stringify(object);
  }

  ref.length = result.length;
  if (top) {
    var pref = "";
    for (var objid in dups) {
      var dup = dups[objid];
      var def = result.substring(dup.pos, dup.pos+dup.length);
      result = ssplice(result, dup.pos, dup.length, "__"+objid);
      pref += "var __"+objid+" = "+def+";\n";
    }
    result = {body:result, decl:pref};
  }

  return result;
}



// Convert parser tree to the format understood by engine
function convertToEngine(parsetree) {
  return convertToEngine.walk(parsetree);
}

function stringifyDots(elem) {
  let sub = elem;
  const path = [];
  while (sub[0] === "dot") {
    path.push(sub[1]);
    sub = sub[2];
  }
  path.push(sub);
  return path.join(".");
}

convertToEngine.applyProp = function(item, name, val, readonly) {
  let curr = item; // output structure
  let sub = name; // input structure
  while (sub[0] === "dot") {
    if (!curr[sub[1]]) {
      curr[sub[1]] = new QMLMetaPropertyGroup();
    }
    curr = curr[sub[1]];
    sub = sub[2];
  }
  curr[sub] = val;
}

convertToEngine.keywords = {
  "true" : true,
  "false" : false,
  "null" : null,
  "undefined" : undefinedMarker
}

convertToEngine.walkers = {
  toplevel: (imports, statement) => {
    const item = { $class: "Component" };
    item.$imports = imports;
    item.$children = [convertToEngine.walk(statement)];
    return item;
  },
  qmlelem: (elem, onProp, statements) => {
    const item = new QMLMetaElement(stringifyDots(elem), onProp);

    for (const i in statements) {
      const statement = statements[i];
      if (!statement) continue;

      const name = statement[1];
      const val = convertToEngine.walk(statement);
      var ro = 0;
      switch (statement[0]) {
        case "qmldefaultprop":
          item.$defaultProperty = name[1];
          item[name[1]] = val;
          break;
        case "qmlpropdefro":
        case "qmlaliasdefro":
          val.readonly = true;
        case "qmlprop":
        case "qmlpropdef":
        case "qmlaliasdef":
        case "qmlmethod":
        case "qmlsignaldef":
          convertToEngine.applyProp(item, name, val, ro);
        break;
        case "qmlelem":
          item.$children.push(val);
        break;
        case "qmlobjdef":
          throw new Error(
            "qmlobjdef support was removed, update qmlweb-parser to ^0.3.0."
            );
        case "qmlobj":
          // Create object to item
          item[name] = item[name] || new QMLMetaPropertyGroup();
          for (const j in val) {
            item[name][j] = val[j];
          }
        break;
        default:
          QmlWeb.log("Unknown statement", statement);
      }
    }
    // Make $children be either a single item or an array, if it's more than one
    if (item.$children.length === 1) {
      item.$children = item.$children[0];
    }

    return item;
  },
  qmlprop: (name, tree, src) => {
    if (name === "id") {
      // id property
      return tree[1][1];
    }
    return convertToEngine.bindout(tree, src, name);
  },
  qmlobjdef: (name, property, tree, src) =>
             convertToEngine.bindout(tree, src, name+"."+property),
  qmlobj: (elem, statements) => {
    const item = {};
    for (const i in statements) {
      const statement = statements[i];
      const name = statement[1];
      const val = convertToEngine.walk(statement);
      if (statement[0] === "qmlprop") {
        convertToEngine.applyProp(item, name, val);
      }
    }
    return item;
  },
  qmlmethod: (name, tree, src) =>
             new QMLMethod(src),
  qmlpropdef:   (name, type, tree, src) => {
              const listTemplate = type=="list"&&typeof(tree)==="string";
              return new QMLPropertyDefinition(
                type,
                (tree&&!listTemplate ? convertToEngine.bindout(tree, src, type+" "+name) : undefined),
                false, listTemplate? tree : undefined
                );
  },
  qmlpropdefro: (name, type, tree, src) => {
              const listTemplate = type=="list"&&typeof(tree)==="string";
              return new QMLPropertyDefinition(
                  type,
                  (tree&&!listTemplate ? convertToEngine.bindout(tree, src, type+" "+name) : undefined),
                  true, listTemplate? tree : undefined
                  );
  },
  qmlaliasdef: function() { return new QMLAliasDefinition(QmlWeb.helpers.slice(arguments, 1)); },
  qmlaliasdefro:function() { return new QMLAliasDefinition(QmlWeb.helpers.slice(arguments, 1), true); },
  qmlsignaldef: (name, params) =>
                new QMLSignalDefinition(params),
  qmldefaultprop: tree => convertToEngine.walk(tree),
  name: src => {
    const k = convertToEngine.keywords[src];
    if (k !== undefined) {
      return k;
    } else {
      return new QmlWeb.QMLBinding(src);
    }
  },
  num: src => +src,
  string: src => String(src),
  array: (tree, src) => {
    const a = [];
    let isList = false;
    let hasBinding = false;
    for (const i in tree) {
      const val = convertToEngine.bindout(tree[i]);
      a.push(val);

      if (val instanceof QMLMetaElement) {
        isList = true;
      } else if (val === undefined || val instanceof QmlWeb.QMLBinding) {
        hasBinding = true;
      }
    }

    if (hasBinding) {
      if (isList) {
        throw new TypeError(
          "An array may either contain bindings or Element definitions."
          );
      }
      return new QmlWeb.QMLBinding(src, tree);
    }

    return a;
  },
  "unary-prefix": (op, arg) => {
    const val = convertToEngine.bindout(arg);
    if (val === undefined || val instanceof QmlWeb.QMLBinding) return undefined;

    const impl = op+""+JSON.stringify(val);
    try {
      var result = eval(impl);
      QmlWeb.log("constant: "+impl+" -> "+result);
      return result;
    } catch (err) {
      QmlWeb.error("Eval error:"+impl);
      return undefined;
    }
  },
  binary: (op, arg1, arg2) => {
    const val1 = convertToEngine.bindout(arg1);
    if (val1 === undefined || val1 instanceof QmlWeb.QMLBinding) return undefined;
    const val2 = convertToEngine.bindout(arg2);
    if (val2 === undefined || val2 instanceof QmlWeb.QMLBinding) return undefined;

    const impl = JSON.stringify(val1)+""+op+""+JSON.stringify(val2);
    try {
      var result = eval(impl);
      QmlWeb.log("constant: "+impl+" -> "+result);
      return result;
    } catch (err) {
      QmlWeb.error("Eval error:"+impl);
      return undefined;
    }
  },
  conditional: (arg1, arg2, arg3) => {
    const val1 = convertToEngine.bindout(arg1);
    if (val1 === undefined || val1 instanceof QmlWeb.QMLBinding) return undefined;
    const val2 = convertToEngine.bindout(arg2);
    if (val2 === undefined || val2 instanceof QmlWeb.QMLBinding) return undefined;
    const val3 = convertToEngine.bindout(arg3);
    if (val3 === undefined || val3 instanceof QmlWeb.QMLBinding) return undefined;

    const impl = JSON.stringify(val1)+"?"+JSON.stringify(val2)+":"+JSON.stringify(val3);
    try {
      var result = eval(impl);
      QmlWeb.log("constant: "+impl+" -> "+result);
      return result;
    } catch (err) {
      QmlWeb.error("Eval error:"+impl);
      return undefined;
    }
  }

  //block: (blocks) => {
  //  blocks.forEach(function(stat) {
  //
  //  });
  //},
  //binary: (op, a, b) => {
  //  if (op === "instanceof") {
  //
  //  }
  //  return convertToEngine.bindout(tree, src, name);
  //},
};

convertToEngine.walk = function(tree) {
  const type = tree[0];
  const walker = convertToEngine.walkers[type];
  if (!walker) {
    QmlWeb.warn(`No walker for ${type}`);
    return undefined;
  }
  return walker.apply(type, tree.slice(1));
};

// Try to bind out tree and return static variable instead of binding
convertToEngine.bindout = function(statement, binding, info) {
  // We want to process the content of the statement
  // (but still handle the case, we get the content directly)
  const tree = statement[0] === "stat" ? statement[1] : statement;

  const type = tree[0];
  let result;
  // ["call", ["dot", ["name", "Qt"], "binding"]
  if (type === "call" && tree[1] && tree[1][0] && tree[1][0]==="dot" && tree[1][2] && tree[1][2]==="binding" &&
      tree[1][1] && tree[1][1][0] && tree[1][1][0]==="name" && tree[1][1][1] && tree[1][1][1]==="Qt") {

    impl = QmlWeb._ubertrim(binding);
    impl = impl.replace(/^Qt\.binding/, "new QtBindingDefinition");
    var qtdef = eval(impl);
    if (qtdef.get && typeof qtdef.get !== "string" && !(qtdef.get instanceof Function) ) {
      throw new Error("Qt.binding  Argument 1 should be string or function :"+binding);
    }
    if (qtdef.set && typeof qtdef.set !== "string" && !(qtdef.set instanceof Function) ) {
      throw new Error("Qt.binding  Argument 2 should be string or function :"+binding);
    }
    if (qtdef.flags && typeof qtdef.flags !== "number" ) {
      throw new Error("Qt.binding  Argument 3 (flags) should be a number :"+binding);
    }

    if (qtdef.get instanceof Function) {
      qtdef.get = QmlWeb.compressImpl(qtdef.get);
    }
    if (qtdef.set instanceof Function) {
      qtdef.set = QmlWeb.compressImpl(qtdef.set);
    }
    result = qtdef;

  } else {

    const walker = convertToEngine.walkers[type];
    if (walker) {
      result = walker.apply(type, tree.slice(1));
    }
    if (result===undefined) {
      //convertToEngine.walk(tree);

      const b = new QmlWeb.QMLBinding(binding, tree, undefined, undefined, info);
      if (!b.src && !b.property) {
        result = undefined;
      } else {
        result = b;
      }
    }
  }
  return result;
};

// Help logger
convertToEngine.amIn = function(str, tree) {
  QmlWeb.log(str);
  if (tree) QmlWeb.log(JSON.stringify(tree, null, "  "));
};


// Convert parser tree to the format understood by engine (and a serializable version)
function serialize(tree) {
  var e = convertToEngine(tree);
  var s = serializeObj(e);
  return s;
}



function loadParser() {
  if (typeof QmlWeb.parse !== "undefined") {
    return;
  }

  QmlWeb.log("Loading parser...");
  const tags = document.getElementsByTagName("script");
  for (const i in tags) {
    if (tags[i].src && tags[i].src.indexOf("/qt.") !== -1) {
      const src = tags[i].src.replace("/qt.", "/qmlweb.parser.");
      // TODO: rewrite to async loading
      const xhr = new XMLHttpRequest();
      xhr.open("GET", src, false);
      xhr.send(null);
      if (xhr.status !== 200 && xhr.status !== 0) {
        // xhr.status === 0 if accessing with file://
        throw new Error("Could not load QmlWeb parser!");
      }
      new Function(xhr.responseText)();
      QmlWeb.parse = QmlWeb.parse;
      QmlWeb.jsparse = QmlWeb.jsparse;
      return;
    }
  }
}

// Function to parse qml and output tree expected by engine
function parseQML(src, file) {
  loadParser();
  QmlWeb.parse.nowParsingFile = file;
  const parsetree = QmlWeb.parse(src, QmlWeb.parse.QmlDocument);
  return convertToEngine(parsetree);
}

QmlWeb.QMLMethod = QMLMethod;
QmlWeb.QtBindingDefinition = QtBindingDefinition;
QmlWeb.QMLPropertyDefinition = QMLPropertyDefinition;
QmlWeb.QMLAliasDefinition = QMLAliasDefinition;
QmlWeb.QMLSignalDefinition = QMLSignalDefinition;
QmlWeb.QMLMetaPropertyGroup = QMLMetaPropertyGroup;
QmlWeb.QMLMetaElement = QMLMetaElement;
QmlWeb.serialize = serialize;
QmlWeb.convertToEngine = convertToEngine;
QmlWeb.loadParser = loadParser;
QmlWeb.parseQML = parseQML;
