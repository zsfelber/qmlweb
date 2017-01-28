// Load resolved file, parse and construct as Component class (.qml)
function loadClass(file) {

  const uri = QmlWeb.$parseURI(file);
  if (!uri) {
    console.warn("qmlweb loadClass: Empty url :", file);
    return undefined;
  }

  let clazz;
  if (uri.scheme === "qrc:/") {
    let t0 = clazz;
    clazz = QmlWeb.qrc[uri.path];
    if (!clazz) {
      console.warn("qmlweb loadClass: Empty qrc entry :", uri.path);
      return undefined;
    }

    // QmlWeb.qrc contains pre-parsed Component objects, but they still need
    // convertToEngine called on them.
    if (!clazz.$class) {
       console.warn("Using legacy semi-pre-parsed qrc is deprecated : "+src);
       clazz = QmlWeb.convertToEngine(clazz);
       clazz.$name = t0.$name;
    }
  } else {
    const src = QmlWeb.getUrlContents(file, true);
    if (!src) {
      console.error("qmlweb loadClass: Failed to load:", file);
      return undefined;
    }

    console.log("qmlweb loadClass: Loading file:", file);
    clazz = QmlWeb.parseQML(src, file);
  }

  if (!clazz) {
    console.warn("qmlweb loadClass: Empty file :", file);
    return undefined;
  }

  if (clazz.$children.length !== 1) {
    console.error("qmlweb loadClass: Failed to load:", file,
      ": A QML component must only contain one root element!");
    return undefined;
  }

  clazz.$file = file;

  return clazz;
}

// Load resolved file and parse as JavaScript
function loadJS(file) {
  const engine = QmlWeb.engine;
  if (file in engine.js) {
    return engine.js[file];
  }

  const uri = QmlWeb.$parseURI(file);
  if (!uri) {
    return undefined;
  }

  let jsData;
  if (uri.scheme === "qrc:/") {
    jsData = QmlWeb.qrc[uri.path];
  } else {
    QmlWeb.loadParser();
    jsData = QmlWeb.jsparse(QmlWeb.getUrlContents(file));
  }

  if (!jsData) {
    return undefined;
  }

  // Remove any ".pragma" statements, as they are not valid JavaScript
  jsData.source = jsData.source.replace(/\.pragma.*(?:\r\n|\r|\n)/, "\n");

  const contextSetter = new Function("$context", `
    with(QmlWeb) with ($context) {
      ${jsData.source}
    }
    ${jsData.exports.map(sym => `$context.${sym} = ${sym};`).join("")}
  `);

  engine.js[file] = contextSetter;

  return contextSetter;
}




/**
 * Get URL contents.
 * @param url {String} Url to fetch.
 * @param skipExceptions {bool} when turned on, ignore exeptions and return
 *        false. This feature is used by readQmlDir.
 * @private
 * @return {mixed} String of contents or false in errors.
 */
function getUrlContents(url, skipExceptions) {
  if (typeof QmlWeb.urlContentCache[url] === "undefined") {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);

    if (skipExceptions) {
      try {
        xhr.send(null);
      } catch (e) {
        return false;
      }
      // it is OK to not have logging here, because DeveloperTools already will
      // have red log record
    } else {
      xhr.send(null);
    }

    if (xhr.status !== 200 && xhr.status !== 0) { // 0 if accessing with file://
      console.log(`Retrieving ${url} failed: ${xhr.responseText}`, xhr);
      return false;
    }
    QmlWeb.urlContentCache[url] = xhr.responseText;
  }
  return QmlWeb.urlContentCache[url];
}
if (typeof QmlWeb.urlContentCache === "undefined") {
  QmlWeb.urlContentCache = {};
}


/**
 * Read qmldir spec file at directory.
 * @param url Url of the directory
 * @return {Object} Object, where .internals lists qmldir internal references
 *                          and .externals lists qmldir external references.
 */

/*  Note on how importing works.

parseQML gives us `tree.$imports` variable, which contains information from
`import` statements.

After each call to parseQML, we call loadImports(tree.$imports).
It in turn invokes readQmlDir() calls for each import, with respect to current
component base path and importPathList().

We keep all component names from all qmldir files in global variable
`engine.qmldir`.

In construct() function, we use `engine.qmldir` for component url lookup.

Reference import info: http://doc.qt.io/qt-5/qtqml-syntax-imports.html
Also please look at notes and TODO's in preloadImports()/loadImports() and
qtcore.js::construct() methods.
*/

function readQmlDir(url) {
  // in case 'url' is empty, do not attach "/"
  // Q1: when this happen?
  const qmldirFileUrl = url.length > 0 ? `${url}/qmldir` : "qmldir";

  const parsedUrl = QmlWeb.$parseURI(qmldirFileUrl);
  if (!parsedUrl) {
    console.warn("Unable to parse directory url : "+qmldirFileUrl);
    return false;
  }

  let qmldir;
  if (parsedUrl.scheme === "qrc:/") {
    qmldir = QmlWeb.qrc[parsedUrl.path];
  } else {
    qmldir = getUrlContents(qmldirFileUrl, true) || undefined;
  }

  const internals = {};
  const externals = {};

  if (qmldir === undefined) {
    return false;
  }

  // we have to check for "://"
  // In that case, item path is meant to be absolute, and we have no need to
  // prefix it with base url
  function makeurl(path) {
    if (path.indexOf(":/") > 0) {
      return path;
    }
    return `${url}/${path}`;
  }

  const lines = qmldir.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    // trim
    const line = lines[i].replace(/^\s+|\s+$/g, "");
    if (!line.length || line[0] === "#") {
      // Empty line or comment
      continue;
    }
    const match = line.split(/\s+/);
    if (match.length === 2 || match.length === 3) {
      if (match[0] === "plugin") {
        console.log(`${url}: qmldir plugins are not supported!`);
      } else if (match[0] === "internal") {
        internals[match[1]] = { url: makeurl(match[2]) };
      } else if (match.length === 2) {
        externals[match[0]] = { url: makeurl(match[1]) };
      } else {
        externals[match[0]] = { url: makeurl(match[2]), version: match[1] };
      }
    } else {
      console.log(`${url}: unmatched: ${line}`);
    }
  }
  return { internals, externals };
}


QmlWeb.loadClass = loadClass;
QmlWeb.loadJS = loadJS;
QmlWeb.getUrlContents = getUrlContents;
QmlWeb.readQmlDir = readQmlDir;
