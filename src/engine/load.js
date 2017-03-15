// Load resolved file, parse and construct as Component class (.qml)
function loadClass(file) {

  const url = QmlWeb.$parseUrl(file);
  if (!url) {
    QmlWeb.warn("qmlweb loadClass: Empty url :", file);
    return undefined;
  }

  let clazz;
  if (url.scheme === "qrc:") {
    clazz = QmlWeb.qrc[url.fullpath];
    if (!clazz) {
      QmlWeb.warn("qmlweb loadClass: Empty qrc entry :", url.path);
      return undefined;
    }

    // QmlWeb.qrc contains pre-parsed Component objects, but they still need
    // convertToEngine called on them.
    if (!clazz.$class) {
      QmlWeb.warn("Using legacy semi-pre-parsed qrc is deprecated : "+file);
      let t0 = clazz;
      clazz = QmlWeb.convertToEngine(clazz);
      clazz.$name = t0.$name;
      clazz.$file = file;
    }
  } else {
    const src = QmlWeb.getUrlContents(file, true);
    if (!src) {
      QmlWeb.error("qmlweb loadClass: Failed to load:", file);
      return undefined;
    }

    QmlWeb.log("qmlweb loadClass: Loading file:", file);
    clazz = QmlWeb.parseQML(src, file);
    clazz.$file = file;
  }

  if (!clazz) {
    QmlWeb.warn("qmlweb loadClass: Empty file :", file);
    return undefined;
  }

  if (clazz.$children.length !== 1) {
    QmlWeb.error("qmlweb loadClass: Failed to load:", file,
      ": A QML component must only contain one root element!");
    return undefined;
  }


  return clazz;
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
      QmlWeb.log(`Retrieving ${url} failed: ${xhr.responseText}`, xhr);
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

  const parsedUrl = QmlWeb.$parseUrl(qmldirFileUrl);
  if (!parsedUrl) {
    QmlWeb.warn("Unable to parse directory url : "+qmldirFileUrl);
    return false;
  }

  let qmldir;
  if (parsedUrl.scheme === "qrc:") {
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
    const parsedPathUrl = QmlWeb.$parseUrl(path);
    if (parsedPathUrl) {
      return parsedPathUrl.uri;
    } else if (path[0]==="/"){
      return `${parsedUrl.baseUri0}${path}`;
    } else {
      return `${parsedUrl.baseUri}${path}`;
    }
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
        QmlWeb.log(`${url}: qmldir plugins are not supported!`);
      } else if (match[0] === "internal") {
        internals[match[1]] = { url: makeurl(match[2]) };
      } else if (match.length === 2) {
        externals[match[0]] = { url: makeurl(match[1]) };
      } else {
        externals[match[0]] = { url: makeurl(match[2]), version: match[1] };
      }
    } else {
      QmlWeb.log(`${url}: unmatched: ${line}`);
    }
  }
  return { internals, externals };
}


QmlWeb.loadClass = QMLEngine.prototype.loadClass = loadClass;
QmlWeb.getUrlContents = QMLEngine.prototype.getUrlContents = getUrlContents;
QmlWeb.readQmlDir = QMLEngine.prototype.readQmlDir = readQmlDir;
