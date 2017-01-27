/* @license

MIT License

Copyright (c) 2011 Lauri Paimen <lauri@paimen.info>
Copyright (c) 2015 Pavel Vasev <pavel.vasev@gmail.com> - initial and working
                                                         import implementation.
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

const perImportContextConstructors = {};
let importContextIds = 0;


// next 3 methods used in Qt.createComponent for qml files lookup
// http://doc.qt.io/qt-5/qqmlengine.html#addImportPath

function addImportPath(dirpath) {
  var engine = QmlWeb.engine;
  engine.userAddedImportPaths.push(dirpath);
}

/* Add engine dirpath to be checked for components. This is the result of
 * something like:
 *
 * import "SomeDir/AnotherDirectory"
 *
 * The importContextId ensures it is only accessible from the file in which
 * it was imported. */
function addComponentImportPath(importContextId, dirpath, qualifier) {
  var engine = QmlWeb.engine;
  if (!engine.componentImportPaths) {
    engine.componentImportPaths = {};
  }
  if (!engine.componentImportPaths[importContextId]) {
    engine.componentImportPaths[importContextId] = {};
  }

  const paths = engine.componentImportPaths[importContextId];

  if (qualifier) {
    if (!paths.qualified) {
      paths.qualified = {};
    }
    paths.qualified[qualifier] = dirpath;
  } else {
    if (!paths.unqualified) {
      paths.unqualified = [];
    }
    paths.unqualified.push(dirpath);
  }
}

function preloadImports(component, imports) {
  if (component.$importContextId) {
    throw new Error("Component imports already loaded. "+this.$context.$basePath+" "+component.$file+"  importContextId:"+component.$importContextId);
  }

  const mergeObjects = QmlWeb.helpers.mergeObjects;
  let constructors = mergeObjects(modules.Main);
  if (imports.filter(row => row[1] === "QtQml").length === 0 &&
      imports.filter(row => row[1] === "QtQuick").length === 1) {
    imports.push(["qmlimport", "QtQml", 2, "", true]);
  }
  for (let i = 0; i < imports.length; ++i) {
    const [, moduleName, moduleVersion, moduleAlias] = imports[i];
    if (!moduleVersion) {
      continue;
    }
    const versionString = moduleVersion % 1 === 0 ?
                            moduleVersion.toFixed(1) :
                            moduleVersion.toString();
    const moduleConstructors = getModuleConstructors(moduleName, versionString);

    if (moduleAlias) {
      constructors[moduleAlias] = mergeObjects(
        constructors[moduleAlias],
        moduleConstructors
      );
    } else {
      constructors = mergeObjects(constructors, moduleConstructors);
    }
  }
  component.$importContextId = ++importContextIds;
  perImportContextConstructors[component.$importContextId] = constructors;
  QmlWeb.constructors = constructors; // TODO: why do we need this?
}


function loadImports(importsArray, currentFileDir = QmlWeb.engine.$basePath,
    importContextId) {
  var engine = QmlWeb.engine;
  if (!engine.qmldirsContents) {
    engine.qmldirsContents = {}; // cache

    // putting initial keys in qmldirsContents - is a hack. We should find a
    // way to explain to qmlweb, is this built-in module or qmldir-style
    // module.
    for (const module in QmlWeb.modules) {
      if (module !== "Main") {
        engine.qmldirsContents[module] = { module:module };
      }
    }
  }

  if (!engine.ctxQmldirs) {
    engine.ctxQmldirs = {}; // resulting components lookup table
  }

  if (!importContextId) {
    throw new Error("loadImports   currentFileDir:"+currentFileDir+"  No importContextId:"+importContextId);
  }

  if (!importsArray || importsArray.length === 0) {
    return;
  }

  for (let i = 0; i < importsArray.length; i++) {
    loadImport(importsArray[i], currentFileDir, importContextId);
  }
}

function loadImport(entry, currentFileDir, importContextId) {
  var engine = QmlWeb.engine;
  let name = entry[1];

  // is it url to remote resource
  const nameIsUrl = name.charAt(0)==="//" || name.indexOf(":/") >= 0;
  // is it a module name, e.g. QtQuick, QtQuick.Controls, etc
  const nameIsQualifiedModuleName = entry[4];
  // is it a js file
  const nameIsJs = name.slice(-3) === ".js";
  // local [relative] dir
  const nameIsDir = !nameIsQualifiedModuleName && !nameIsUrl && !nameIsJs;

  if (nameIsDir) {
    name = $resolvePath(name, currentFileDir);
    if (name[name.length - 1] === "/") {
      // remove trailing slash as it required for `readQmlDir`
      name = name.substr(0, name.length - 1);
    }
  }

  let content = engine.qmldirsContents[name];
  // check if we have already loaded that qmldir file
  if (!content) {
    var qrcName;
    if (nameIsQualifiedModuleName && engine.userAddedModulePaths[name]) {
      // 1. we have qualified module and user had configured path for that
      // module with addModulePath
      qrcName = engine.userAddedModulePaths[name];
      content = QmlWeb.readQmlDir(qrcName);
    } else if (nameIsUrl || nameIsDir) {
      // 2. direct load
      // nameIsUrl => url do not need dirs
      // nameIsDir => already computed full path above
      qrcName = name;
      content = QmlWeb.readQmlDir(name);
    } else if (nameIsJs) {
      // 3. Js file, don't need qmldir
    } else {
      // 4. qt-style lookup for qualified module
      const probableDirs = [currentFileDir].concat(importPathList());
      var diredName = name.replace(/\./g, "/");
      qrcName = "qrc:/"+diredName;

      for (let k = 0; k < probableDirs.length; k++) {
        const file = probableDirs[k] + diredName;
        content = QmlWeb.readQmlDir(file);
        if (content) {
          break;
        }
      }
    }

    // NOTE Making precompiled qrc entries available in imports :
    var qrcModule = QmlWeb.qrcModules[qrcName];
    if (qrcModule) {
      if (!content) {
        content = {};
      }
      content.qrcs = qrcModule;
    }

    // keep already loaded qmldir files
    engine.qmldirsContents[name] = content;
  }

  /* If there is no qmldir, add these directories to the list of places to
    * search for components (within this import scope). "noqmldir" is
    * inserted into the qmldir cache to avoid future attempts at fetching
    * the qmldir file, but we always need to the call to
    * "addComponentImportPath" for these sorts of directories. */
  if (!content || content === "noqmldir") {
    if (nameIsDir) {
      if (entry[3]) {
        /* Use entry[1] directly, as we don't want to include the
          * basePath, otherwise it gets prepended twice in
          * createComponent. */
        addComponentImportPath(importContextId,
          `${entry[1]}/`, entry[3]);
      } else {
        addComponentImportPath(importContextId, `${name}/`);
      }
    }

    engine.qmldirsContents[name] = "noqmldir";
    return;
  }

  // NOTE we copy it to current component namespace (import context):
  var qmldirs = engine.ctxQmldirs[importContextId];
  if (!qmldirs) {
    engine.ctxQmldirs[importContextId] = qmldirs = {};
  }

  if (content.qrcs) {
    for (const attrname in content.qrcs) {
      qmldirs[attrname] = {url : content.qrcs[attrname]};
    }
  }
  for (const attrname in content.externals) {
    qmldirs[attrname] = content.externals[attrname];
  }

  // keep already loaded qmldir files (done, see above)
  //engine.qmldirsContents[name] = content;
}




QmlWeb.perImportContextConstructors = perImportContextConstructors;
QmlWeb.preloadImports = preloadImports;
QmlWeb.addImportPath = addImportPath;
QmlWeb.addComponentImportPath = addComponentImportPath;
QmlWeb.loadImports = loadImports;
QmlWeb.loadImport = loadImport;
