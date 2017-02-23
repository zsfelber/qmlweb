
// eslint-disable-next-line max-len
/** from http://docs.closure-library.googlecode.com/git/local_closure_goog_uri_uri.js.source.html
 *
 * Removes dot segments in given path component, as described in
 * RFC 3986, section 5.2.4.
 *
  // Remove duplicate slashes and dot segments in the path

 * @param {string} path A non-empty path component.
 * @return {string} Path component with removed dot segments.
 */
function normalizePath(path) {
  // path.starts/endsWith("/") is not supported in some browsers
  const segments = path.split("/");
  const out = [];
  const back = [];
  let root = "";

  let trailingSlash = 0;
  for (let pos = 0; pos < segments.length; pos++) {
    const segment = segments[pos];

    if (segment === ".") {
      trailingSlash = true;
    } else if (segment === "..") {
      if (out.length) {
        out.pop();
      } else {
        back.unshift("..");
      }
      trailingSlash = true;
    } else if (segment !== "") {
      out.push(segment);
      trailingSlash = false;
    } else {
      if (pos === 0) {
        root = "/";
      }
      trailingSlash = true;
    }
  }
  if (trailingSlash) {
    out.push("");
  }

  return root + back.concat(out).join("/");
}

function resolveBasePath(uri) {
  let pu = $parseUrl(uri);
  if (!pu) {
    if (!this.$basePathUrlA) {
      // Create an anchor element to get the absolute path from the DOM
      this.$basePathUrlA = document.createElement("a");
    }
    this.$basePathUrlA.href = uri;
    pu = $parseUrl(this.$basePathUrlA.href);
    if (!pu) {
      throw new QmlWeb.AssertionError("Assertion failed : <A> element href should be absolute url, but it is : ("+uri+" ->) "+this.$basePathUrlA.href)
    }
  }
  return pu;
}

function importSearchPaths(component) {
  const paths = component.componentImportPaths;
  if (!paths) {
    return [];
  }
  return paths.unqualified || [];
}

function qualifiedImportPath(component, qualifier) {
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
  engine.userAddedModulePaths[moduleName] = dirPath?dirPath.replace(/[/]$/, ""):null;
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
    const nameIsUrl = /^(\w+):/.test(name)||name.startsWith("//");
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

// URL parser method
function $parseUrl(uri, allowLocal) {
  //                        scheme    pref  host     :port   path           file
  const match = uri.match(/^([^/:]+:)?([/]*)([^/:]*)(:(\d*))?([/]|[/].+?[/])([^/]*)$/);
  if (match && (match[1] || allowLocal)) {
    if (match[1]===undefined) match[1]="";
    if (match[2]===undefined) match[2]="";
    if (match[4]===undefined) match[4]="";
    const abs = match[2].length>=2;
    const pref = abs?"//":pref;                    // leading slash (omit unnecessary ones)
                                                   // htpp://a.com/a -> /     qrc:/a/b/c -> ''      qrc:///a/b/c -> /       qrc://localhost:8080/b/c -> /
                                                   // a/b/c -> ''             /a/b/c -> ''          //a/b/c -> /
    const au0 = match[3]+match[4];                 // host:port or path first
    const au = abs ? au0 : "";                     // host:port
    const scheme = match[1];                       // htpp:  qrc:
    const path = abs ? match[6] : au0+match[6];    // htpp://a.com/a -> a     qrc:/a/b/c -> a/b/c   qrc:///a/b/c -> /a/b/c   qrc://localhost:8080/b/c -> /b/c
                                                   // a/b/c -> a/b/c          /a/b/c -> /a/b/c      //a/b/c -> /a/b/c
    const file = match[7];
    const buri0 = scheme + pref + au;
    const buri = buri0 + path;
    uri = buri + file;

    const url = {
      uri: uri,
      baseUri0: buri0,
      baseUri: buri,
      scheme: scheme,
      prefix: pref,
      host: match[3],
      authority: au,
      port: match[5],
      path: path,
      file: file,
      path2: path + file
    };
    if (url.port && !au) {
      console.warn("Bad url, missing leading '/' after scheme (first tag with port number interpreted as file path item) : "+uri);
    }

    return url;
  }
  return undefined;
}

// Return a path to load the file
function $resolvePath(file, basePathUrl) {
  if (file && (/^(\w+):/.test(file)||file.startsWith("//"))) {
    return file;
  }

  if (!basePathUrl) {
    basePathUrl = QmlWeb.engine.$component.$basePathUrl;
  }

  if (!basePathUrl) {
    return file;
  }

  if (file===undefined || file===null) {
    file = basePathUrl.file;
  }

  if (!file) {
    return file;
  }

  let path;
  if (file && file.charAt(0) === "/") {
    path = file;
  } else {
    path = `${basePathUrl.path}${file}`;
  }
  let url;
  // Remove duplicate slashes and dot segments in the path
  path = normalizePath(path);
  url = `${basePathUrl.baseUri0}${path}`;

  return url;
}

// Return a DOM-valid path to load the image (fileURL is an already-resolved
// URL)
function $resolveImageURL(fileURL) {
  const url = $parseUrl(fileURL);
  // If we are within the resource system, look up a "real" path that can be
  // used by the DOM. If not found, return the path itself without the
  // "qrc:/" scheme.
  if (url && (url.scheme === "qrc:")) {
    return QmlWeb.qrc[url.path2] || url.path2;
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
    return typeof(o) === "string" ? $parseUrl(o) : false;
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


QmlWeb.normalizePath = normalizePath;

QmlWeb.resolveBasePath = resolveBasePath;

QmlWeb.importSearchPaths = importSearchPaths;

QmlWeb.qualifiedImportPath = qualifiedImportPath;

QmlWeb.setImportPathList = setImportPathList;

QmlWeb.importPathList = importPathList;
QmlWeb.addModulePath = addModulePath;

QmlWeb.resolveClass = resolveClass;

QmlWeb.resolveImport = resolveImport;

QmlWeb.resolveClassImport = resolveClassImport;

// This parses the full URL into scheme and path
QmlWeb.$parseUrl = $parseUrl;

QmlWeb.$parseUrl = $parseUrl;

// Return a path to load the file
QmlWeb.$resolvePath = $resolvePath;

// Return a DOM-valid path to load the image (fileURL is an already-resolved
// URL)
QmlWeb.$resolveImageURL = $resolveImageURL;
QmlWeb.$instanceOf = $instanceOf;
