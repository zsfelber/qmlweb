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
    super(src, undefined, QMLBinding.ImplFunction);
    Object.defineProperty(this, "serializedTypeId", {
      value: "m",
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
  constructor(type, value, readonly) {
    this.type = type;
    this.value = value;
    this.readonly = readonly;
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

function slice(a, start) {
  return Array.prototype.slice.call(a, start || 0);
}

var s_objectIds = 0;

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
        item.$defaultProperty = name;
        item[name] = val;
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
        console.log("Unknown statement", statement);
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
  qmlpropdef: (name, type, tree, src) =>
              new QMLPropertyDefinition(
                type,
                tree ? convertToEngine.bindout(tree, src, type+" "+name) : undefined
                ),
  qmlpropdefro: (name, type, tree, src) =>
                new QMLPropertyDefinition(
                  type,
                  tree ? convertToEngine.bindout(tree, src, type+" "+name) : undefined,
                         true
                  ),
  qmlaliasdef: function() { return new QMLAliasDefinition(slice(arguments, 1)); },
  qmlaliasdefro:function() { return new QMLAliasDefinition(slice(arguments, 1), true); },
  qmlsignaldef: (name, params) =>
                new QMLSignalDefinition(params),
  qmldefaultprop: tree => convertToEngine.walk(tree),
  name: src => {
    if (src === "true" || src === "false") {
      return src === "true";
    } else if (typeof src === "boolean") {
      // TODO: is this needed? kept for compat with ==
      return src;
    }
    return new QmlWeb.QMLBinding(src);
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
      } else if (val instanceof QmlWeb.QMLBinding) {
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
    console.warn(`No walker for ${type}`);
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
  const walker = convertToEngine.walkers[type];
  if (walker) {
    return walker.apply(type, tree.slice(1));
  }
  //convertToEngine.walk(tree);

  return new QmlWeb.QMLBinding(binding, tree, undefined, undefined, info);
};

// Help logger
convertToEngine.amIn = function(str, tree) {
  console.log(str);
  if (tree) console.log(JSON.stringify(tree, null, "  "));
};


// Convert parser tree to the format understood by engine (and a serializable version)
function serialize(tree) {
  var e = convertToEngine(tree);
  var s = serializeObj(e);
  return s;
}

function serializeParserInit() {
  function b(init) {
    var result = new QmlWeb.QMLBinding();
    QmlWeb.helpers.copy(result, init);
    return result;
  }

  function m(init) {
    var result = new QmlWeb.QMLMethod();
    QmlWeb.helpers.copy(result, init);
    return result;
  }

  function p(init) {
    var result = new QmlWeb.QMLPropertyDefinition();
    QmlWeb.helpers.copy(result, init);
    return result;
  }

  function a(init) {
    var result = new QmlWeb.QMLAliasDefinition();
    QmlWeb.helpers.copy(result, init);
    return result;
  }

  function s(init) {
    var result = new QmlWeb.QMLSignalDefinition();
    QmlWeb.helpers.copy(result, init);
    return result;
  }

  function g(init) {
    var result = new QmlWeb.QMLMetaPropertyGroup();
    QmlWeb.helpers.copy(result, init);
    return result;
  }

  function e(init) {
    var result = new QmlWeb.QMLMetaElement();
    QmlWeb.helpers.copy(result, init);
    return result;
  }

  var result = "";
  result += "var _;\n";
  result += b.toString();
  result += m.toString();
  result += p.toString();
  result += a.toString();
  result += s.toString();
  result += g.toString();
  result += e.toString();
  return result;
}


function loadParser() {
  if (typeof QmlWeb.parse !== "undefined") {
    return;
  }

  console.log("Loading parser...");
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
QmlWeb.QMLPropertyDefinition = QMLPropertyDefinition;
QmlWeb.QMLAliasDefinition = QMLAliasDefinition;
QmlWeb.QMLSignalDefinition = QMLSignalDefinition;
QmlWeb.QMLMetaPropertyGroup = QMLMetaPropertyGroup;
QmlWeb.QMLMetaElement = QMLMetaElement;
QmlWeb.serialize = serialize;
QmlWeb.serializeParserInit = serializeParserInit;
QmlWeb.convertToEngine = convertToEngine;
QmlWeb.loadParser = loadParser;
QmlWeb.parseQML = parseQML;
