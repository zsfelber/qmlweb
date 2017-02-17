
// eslint-disable-next-line max-len
/** from http://docs.closure-library.googlecode.com/git/local_closure_goog_uri_uri.js.source.html
 *
 * Removes dot segments in given path component, as described in
 * RFC 3986, section 5.2.4.
 *
 * @param {string} path A non-empty path component.
 * @return {string} Path component with removed dot segments.
 */
function removeDotSegments(path) {
  // path.startsWith("/") is not supported in some browsers
  let leadingSlash = path && path[0] === "/";
  const segments = path.split("/");
  const out = [];

  for (let pos = 0; pos < segments.length;) {
    const segment = segments[pos++];

    if (segment === ".") {
      if (leadingSlash && pos === segments.length) {
        out.push("");
      }
    } else if (segment === "..") {
      if (out.length > 1 || out.length === 1 && out[0] !== "") {
        out.pop();
      }
      if (leadingSlash && pos === segments.length) {
        out.push("");
      }
    } else {
      out.push(segment);
      leadingSlash = true;
    }
  }

  return out.join("/");
}

function extractBasePath(file) {
  // work both in url ("/") and windows ("\", from file://d:\test\) notation
  const basePath = file.split(/[/\\]/);
  basePath[basePath.length - 1] = "";
  return basePath.join("/");
}

function resolveBasePath(uri) {
  if (!this.$basePathA) {
    // Create an anchor element to get the absolute path from the DOM
    this.$basePathA = document.createElement("a");
  }
  let x0 = extractBasePath(uri);
  this.$basePathA.href = x0;
  let x = this.$basePathA.href;
  if (!x0) {
    x = extractBasePath(x);
  }
  return x;
}

function extractFileName(file) {
  return file.split(/[/\\]/).pop();
}

function importSearchPaths(component) {
  const engine = QmlWeb.engine;
  if (!engine.componentImportPaths) {
    return [];
  }
  const paths = component.componentImportPaths;
  if (!paths) {
    return [];
  }
  return paths.unqualified || [];
}

function qualifiedImportPath(component, qualifier) {
  const engine = QmlWeb.engine;
  if (!engine.componentImportPaths) {
    return "";
  }
  const paths = component.componentImportPaths;
  if (!paths || !paths.qualified) {
    return "";
  }
  return paths.qualified[qualifier] || "";
}

function setImportPathList(arrayOfDirs) {
  const engine = QmlWeb.engine;
  engine.userAddedImportPaths = arrayOfDirs;
}

function importPathList() {
  const engine = QmlWeb.engine;
  return engine.userAddedImportPaths;
}

// `addModulePath` defines conrete path for module lookup
// e.g. addModulePath("QtQuick.Controls", "http://example.com/controls")
// will force system to `import QtQuick.Controls` module from
// `http://example.com/controls/qmldir`

function addModulePath(moduleName, dirPath) {
  const engine = QmlWeb.engine;
  // Keep the mapping. It will be used in loadImports() function.
  // Remove trailing slash as it required for `readQmlDir`.
  engine.userAddedModulePaths[moduleName] = dirPath?dirPath.replace(/\/$/, ""):null;
}

/*registerProperty(obj, propName) {
  const dependantProperties = [];
  let value = obj[propName];

  const getter = () => {
    const QMLProperty = QmlWeb.QMLProperty;
    if (QMLProperty.evaluatingProperty &&
        dependantProperties.indexOf(QMLProperty.evaluatingProperty) === -1) {
      dependantProperties.push(QMLProperty.evaluatingProperty);
    }
    return value;
  };

  const setter = newVal => {
    value = newVal;
    for (const i in dependantProperties) {
      dependantProperties[i].update();
    }
  };

  QmlWeb.setupGetterSetter(obj, propName, getter, setter);
}*/

function resolveClass(file) {
  const engine = QmlWeb.engine;

  let clazz = engine.classes[file];

  if (!clazz) {
    clazz = QmlWeb.loadClass(file);
    engine.classes[file] = clazz;
  }

  return clazz;
}


function resolveImport(name) {
  const engine = QmlWeb.engine;
  const loaderComponent = engine.$component;

  let file = $resolvePath(name);

  let clazz;
  // If "name" was a full URL, "file" will be equivalent to name and this
  // will try and load the Component from the full URL, otherwise, this
  // doubles as checking for the file in the current directory.
  clazz = resolveClass(file);

  // If the Component is not found, and it is not a URL, look for "name" in
  // this context's importSearchPaths
  if (!clazz) {
    const nameIsUrl = $parseURI(name) !== undefined;
    if (!nameIsUrl) {
      const moreDirs = importSearchPaths(loaderComponent);
      for (let i = 0; i < moreDirs.length; i++) {
        file = `${moreDirs[i]}${name}`;
        // TODO gz resolveClass  += engine.containers[...]
        clazz = resolveClass(file);
        if (clazz) break;
      }
    }
  }

  if (!clazz) {
    QmlWeb.warn("Class not found : "+name+"  resolved to:"+file+"  in context:"+(loaderComponent?loaderComponent.context:"<null>"));
  }

  return {clazz, $file:file};
}

function resolveClassImport(name) {
  const loaderComponent = QmlWeb.engine.$component;
  const engine = QmlWeb.engine;
  // Load component from file. Please look at import.js for main notes.
  // Actually, we have to use that order:
  // 1) try to load component from current basePath
  // 2) from importPathList
  // 3) from directories in imports statements and then
  // 4) from qmldir files
  // Currently we use order: 3a, 2, 3b, 4, 1
  // TODO: engine.qmldirs is global for all loaded components.
  //       That's not qml's original behaviour.

  // 3)regular (versioned) modules only: (from Component.constructor -> QmlWeb.loadImports)
  let constructors = loaderComponent ? loaderComponent.moduleConstructors : QmlWeb.constructors;

  const path = name.split(".");
  for (let ci = 0; ci < path.length; ++ci) {
    const c = path[ci];
    constructors = constructors[c];
    if (constructors === undefined) {
      break;
    }
  }

  if (constructors !== undefined) {
    return {classConstructor:constructors, path:path};
  } else if (loaderComponent) {

    // 2) 3)preloaded qrc-s  4)
    const qmldirs = loaderComponent.ctxQmldirs;

    const qdirInfo = qmldirs ? qmldirs[name] : null;
    // Are we have info on that component in some imported qmldir files?

    let filePath;
    if (qdirInfo) {
      filePath = qdirInfo.url;
    } else if (path.length === 2) {
      const qualified = qualifiedImportPath(
        loaderComponent, path[0]
      );
      filePath = `${qualified}${path[1]}.qml`;
    } else {
      filePath = `${path[0]}.qml`;
    }

    // 1) through $resolvePath(name);
    let imp = resolveImport(filePath);

    imp.$path=path;

    return imp;
  } else {
    throw new Error("Could not resolve object import dirs with no loader component (no registered global type found) : "+name);
  }
}

// This parses the full URL into scheme and path
function $parseURI(uri) {
  const match = uri.match(/^([^/]*?:\/)(.*)$/);
  if (match) {
    return {
      scheme: match[1],
      path: match[2],
      authority: "",
    };
  }
  return undefined;
}

// This parses the full URL into scheme, authority and path
function $parseURIwAuth(uri) {
  const match = uri.match(/^([^/]*?:\/)(.*?)\/(.*)$/);
  if (match) {
    return {
      scheme: match[1],
      authority: match[2],
      path: match[3]
    };
  }
  return undefined;
}

function $parseURIlong(uri) {
  const match = uri.match(/^([^/]*?:\/)(.*)\/(.*?)$/);
  if (match) {
    return {
      scheme: match[1],
      path: match[2],
      file: match[3]
    };
  }
  return undefined;
}

function $parseURIwPort(uri) {
  const match = uri.match(/^([^/]*?:\/)(?:(.*?):(\d+))?(.*)$/);
  if (match) {
    return {
      scheme: match[1],
      host: match[2],
      port: match[3],
      path: match[4],
      authority: "",
    };
  }
  return undefined;
}

// Return a path to load the file
function $resolvePath(file, basePath) {
  if (!basePath) {
    basePath = QmlWeb.engine.$component.$basePath;
  }
  // probably, replace :// with :/ ?
  if (!file || file.indexOf(":/") !== -1 || file.indexOf("data:") === 0 ||
    file.indexOf("blob:") === 0) {
    return file;
  }

  const basePathURI = $parseURI(basePath);
  if (!basePathURI) {
    return file;
  }

  let path = basePathURI.path;
  if (file && file.charAt(0) === "/") {
    path = file;
  } else {
    path = `${path}${file}`;
  }

  // Remove duplicate slashes and dot segments in the path
  path = removeDotSegments(path.replace(/([^:]\/)\/+/g, "$1"));

  return `${basePathURI.scheme}${basePathURI.authority}${path}`;
}

// Return a DOM-valid path to load the image (fileURL is an already-resolved
// URL)
function $resolveImageURL(fileURL) {
  const uri = $parseURI(fileURL);
  // If we are within the resource system, look up a "real" path that can be
  // used by the DOM. If not found, return the path itself without the
  // "qrc:/" scheme.
  if (uri && uri.scheme === "qrc:/") {
    return QmlWeb.qrc[uri.path] || uri.path;
  }

  // Something we can't parse, just pass it through
  return fileURL;
}

function $instanceOf(o, typestring, component) {

  switch (typestring) {
  case "Function":
  case "function":
    return o instanceof Function;
  case "Array":
  case "array":
    return o instanceof Array;
  case "Object":
  case "object":
  case "var":
    return o instanceof Object;
  case "String":
  case "string":
    return typeof(o) === "string";
  case "Number":
    if (typeof(o) === "number") return true;
    else break;
  case "number":
  case "int":
  case "real":
  case "double":
  case "float":
    return typeof(o) === "number";
  case "Date":
    if (typeof(o) === "date") return true;
    else break;
  case "date":
  case "datetime":
  case "time":
    return typeof(o) === "date";
  case "url":
    return typeof(o) === "string" ? $parseURI(o) : false;
  case "RegExp":
    if (o instanceof RegExp) return true;
    else break;
  }

  if (!component) {
    throw new Error("QmlWeb.$instanceOf : Class : "+typestring+" Argument error, missing Component");
  }

  if (o && o.$base) {

    o = o.$leaf;

    var clinfo = QmlWeb.resolveClassImport(typestring, component);
    let f;
    if (clinfo.constructor) {
      return o instanceof clinfo.constructor;
    } else if (f=clinfo.$file) {
      for (let c = o.$component; c; c=c.loaderComponent) {
        if (c.$file===f) {
          return true;
        }
      }
      return false;
    } else {
      throw new Error("QmlWeb.$instanceOf : Class not found : "+typestring+" in context of "+component.context);
    }
  } else {

  }

}


QmlWeb.removeDotSegments = removeDotSegments;
QmlWeb.extractBasePath = extractBasePath;
QmlWeb.resolveBasePath = resolveBasePath;

QmlWeb.extractFileName = extractFileName;

QmlWeb.importSearchPaths = importSearchPaths;

QmlWeb.qualifiedImportPath = qualifiedImportPath;

QmlWeb.setImportPathList = setImportPathList;

QmlWeb.importPathList = importPathList;
QmlWeb.addModulePath = addModulePath;

QmlWeb.resolveClass = resolveClass;

QmlWeb.resolveImport = resolveImport;

QmlWeb.resolveClassImport = resolveClassImport;

// This parses the full URL into scheme and path
QmlWeb.$parseURI = $parseURI;

// This parses the full URL into scheme, authority and path
QmlWeb.$parseURIwAuth = $parseURIwAuth;

QmlWeb.$parseURIlong = $parseURIlong;

QmlWeb.$parseURIwPort = $parseURIwPort;

// Return a path to load the file
QmlWeb.$resolvePath = $resolvePath;

// Return a DOM-valid path to load the image (fileURL is an already-resolved
// URL)
QmlWeb.$resolveImageURL = $resolveImageURL;
QmlWeb.$instanceOf = $instanceOf;
