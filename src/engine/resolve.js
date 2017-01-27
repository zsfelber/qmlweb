
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

function extractFileName(file) {
  return file.split(/[/\\]/).pop();
}

function importSearchPaths(component) {
  var engine = QmlWeb.engine;
  if (!engine.componentImportPaths) {
    return [];
  }
  const paths = engine.componentImportPaths[importContextId];
  if (!paths) {
    return [];
  }
  return paths.unqualified || [];
}

function qualifiedImportPath(component, qualifier) {
  var engine = QmlWeb.engine;
  if (!engine.componentImportPaths) {
    return "";
  }
  const paths = engine.componentImportPaths[importContextId];
  if (!paths || !paths.qualified) {
    return "";
  }
  return paths.qualified[qualifier] || "";
}

function setImportPathList(arrayOfDirs) {
  var engine = QmlWeb.engine;
  engine.userAddedImportPaths = arrayOfDirs;
}

function importPathList() {
  var engine = QmlWeb.engine;
  return engine.userAddedImportPaths;
}

// `addModulePath` defines conrete path for module lookup
// e.g. addModulePath("QtQuick.Controls", "http://example.com/controls")
// will force system to `import QtQuick.Controls` module from
// `http://example.com/controls/qmldir`

function addModulePath(moduleName, dirPath) {
  var engine = QmlWeb.engine;
  // Keep the mapping. It will be used in loadImports() function.
  // Remove trailing slash as it required for `readQmlDir`.
  engine.userAddedModulePaths[moduleName] = dirPath.replace(/\/$/, "");
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

function resolveImport(name) {
  var engine = QmlWeb.engine;

  let file = $resolvePath(name);

  let component = engine.components[file];
  let clazz;
  // TODO gz
  if (component) {
    clazz = component.object;
  }

  if (!clazz) {
    // If "name" was a full URL, "file" will be equivalent to name and this
    // will try and load the Component from the full URL, otherwise, this
    // doubles as checking for the file in the current directory.
    clazz = QmlWeb.loadClass(file);
  }

  // If the Component is not found, and it is not a URL, look for "name" in
  // this context's importSearchPaths
  if (!clazz) {
    const nameIsUrl = $parseURI(name) !== undefined;
    if (!nameIsUrl) {
      const moreDirs = importSearchPaths(
        QmlWeb.executionContext.$importContextId/*TODO gz component*/);
      for (let i = 0; i < moreDirs.length; i++) {
        file = `${moreDirs[i]}${name}`;
        clazz = QmlWeb.loadClass(file);
        if (clazz) break;
      }
    }
  }

  return {clazz, file};
}

function findClass(name, component) {
  var engine = QmlWeb.engine;
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
  let constructors = component.perImportContextConstructors;

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
  } else {

    // 2) 3)preloaded qrc-s  4)
    const qmldirs = component.ctxQmldirs;

    const qdirInfo = qmldirs ? qmldirs[name] : null;
    // Are we have info on that component in some imported qmldir files?

    let filePath;
    if (qdirInfo) {
      filePath = qdirInfo.url;
    } else if (path.length === 2) {
      const qualified = qualifiedImportPath(
        context.$importContextId, path[0]
      );
      filePath = `${qualified}${path[1]}.qml`;
    } else {
      filePath = `${path[0]}.qml`;
    }

    // 1) through $resolvePath(name);
    let imp = resolveImport(filePath);

    imp.path=path;

    return imp;
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

// Return a path to load the file
function $resolvePath(file, basePath = QmlWeb.engine.$basePath) {
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





QmlWeb.removeDotSegments = removeDotSegments;
QmlWeb.extractBasePath = extractBasePath;

QmlWeb.extractFileName = extractFileName;

QmlWeb.importSearchPaths = importSearchPaths;

QmlWeb.qualifiedImportPath = qualifiedImportPath;

QmlWeb.setImportPathList = setImportPathList;

QmlWeb.importPathList = importPathList;
QmlWeb.addModulePath = addModulePath;

QmlWeb.resolveImport = resolveImport;

QmlWeb.findClass = findClass;

// This parses the full URL into scheme and path
QmlWeb.$parseURI = $parseURI;

// This parses the full URL into scheme, authority and path
QmlWeb.$parseURIwAuth = $parseURIwAuth;

QmlWeb.$parseURIlong = $parseURIlong;

// Return a path to load the file
QmlWeb.$resolvePath = $resolvePath;

// Return a DOM-valid path to load the image (fileURL is an already-resolved
// URL)
QmlWeb.$resolveImageURL = $resolveImageURL;
