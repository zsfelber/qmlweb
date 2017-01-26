// There can only be one running QMLEngine.
// This variable points to the currently running engine.
QmlWeb.engine = null;

QmlWeb.useShadowDom = true;

const geometryProperties = [
  "width", "height", "fill", "x", "y", "left", "right", "top", "bottom"
];

class QMLContext {
  constructor() {
    this.$elements = {};
    this.$elementoverloads = {};
    this.$elementoverloadsnoalias = {};
  }

  nameForObject(obj) {
    for (const name in this) {
      if (this[name] === obj) {
        return name;
      }
    }
    return undefined;
  }
}


// QML engine. EXPORTED.
class QMLEngine {
  constructor(element) {
    //----------Public Members----------

    //this.fps = 60;
    // Math.floor, causes bugs to timing?
    //this.$interval = Math.floor(1000 / this.fps);
    this.dom = element || document.body;

    // Target for the DOM children
    this.domTarget = this.dom;
    if (QmlWeb.useShadowDom && this.dom.attachShadow) {
      this.domTarget = this.dom.attachShadow({ mode: "open" });
    }

    // Cached component trees (post-QmlWeb.convertToEngine)
    this.components = {};
    this.classes = {};

    // Cached parsed JS files (post-QmlWeb.jsparse)
    this.js = {};

    // List of Component.completed signals
    this.completedSignals = [];

    // Current operation state of the engine (Idle, init, etc.)
    this.operationState = 1;

    // List of properties whose values are bindings. For internal use only.
    // +
    // List of operations to perform later after init. For internal use only.
    this.pendingOperations = [];

    // Root object of the engine
    this.rootObject = null;
    this.rootContext = new QMLContext();

    // Base path of qml engine (used for resource loading)
    this.$basePath = "";

    // Module import paths overrides
    this.userAddedModulePaths = {};

    // Stores data for setImportPathList(), importPathList(), and addImportPath
    this.userAddedImportPaths = [];

    //----------Private Members---------

    // Ticker resource id and ticker callbacks
    this._tickers = [];
    //this._lastTick = Date.now();

    // Callbacks for stopping or starting the engine
    this._whenStop = [];
    this._whenStart = [];

    // Keyboard management
    this.$initKeyboard();

    //----------Construct----------

    // TODO: Move to module initialization
    const QMLBaseObject = QmlWeb.getConstructor("QtQml", "2.0", "QtObject");
    const constructors = QmlWeb.constructors;
    for (const i in constructors) {
      /*
        http://doc.qt.io/qt-5/qtqml-syntax-objectattributes.html#attached-properties-and-attached-signal-handlers

        Some object treated as Attached. For example, Component.
        In the cycle, we go via constructors and find such objects.
        Then, we set property to object `QMLBaseObject.prototype` with name of
        that object, and with specific getter func.
        E.g., we create "someitem.Component" here.
        Later, if somebody will read that property, the getter will be invoked.
        Here all getters are set to `getAttachedObject` only, which is actually
        dedicated for Component attached object.
        The code of `getAttachedObject` checks whether $Component internal
        variable exist, and creates it if it absent.
        Then, `getAttachedObject` adds self "completed" signal to global
        `engine.completedSignals`.
        That is how completed handlers gathered into global list. This list then
        is called by `engine.callCompletedSignals`.

        p.s. At the moment, Repeater and Loader manually call
        `Component.completed` signals on objects they create.
        At the same time, those signals are still pushed to
        `engine.completedSignals` by getAttachedObject.
      */
      if (constructors[i].getAttachedObject) {
        QmlWeb.setupGetter(QMLBaseObject.prototype, i,
                    constructors[i].getAttachedObject);
      }
    }

    // No QML stuff should stand out the root element
    this.dom.style.overflow = "hidden";

    // Needed to make absolute positioning work
    if (!this.dom.style.position) {
      const style = widow.getComputedStyle(this.dom);
      if (style.getPropertyValue("position") === "static") {
        this.dom.style.position = "relative";
        this.dom.style.top = "0";
        this.dom.style.left = "0";
      }
    }

    widow.addEventListener("resize", () => this.updateGeometry());
  }

  //---------- Public Methods ----------

  updateGeometry() {
    // we have to call `this.implicitHeight =` and `this.implicitWidth =`
    // each time the root element changes it's geometry
    // to reposition child elements of qml scene
    let width;
    let height;
    if (this.dom === document.body) {
      width = widow.innerWidth;
      height = widow.innerHeight;
    } else {
      const style = widow.getComputedStyle(this.dom);
      width = parseFloat(style.getPropertyValue("width"), 10);
      height = parseFloat(style.getPropertyValue("height"), 10);
    }
    if (width) {
      this.rootObject.width = width;
    }
    if (height) {
      this.rootObject.height = height;
    }
  }

  // Start the engine
  start() {
    QmlWeb.engine = this;
    const QMLOperationState = QmlWeb.QMLOperationState;
    if (this.operationState !== QMLOperationState.Running) {
      this.operationState = QMLOperationState.Running;
      //this._tickerId = setInterval(this._tick.bind(this), this.$interval);
      //this._tickers.forEach(ticker => ticker(now, elapsed));
      this._whenStart.forEach(callback => callback());
      this._tickers.forEach(ticker => $startTicker(ticker));
    }
  }

  // Stop the engine
  stop() {
    const QMLOperationState = QmlWeb.QMLOperationState;
    if (this.operationState === QMLOperationState.Running) {
      //clearInterval(this._tickerId);
      this._tickers.forEach(ticker => $stopTicker(ticker));
      this.operationState = QMLOperationState.Idle;
      this._whenStop.forEach(callback => callback());
    }
  }

  // eslint-disable-next-line max-len
  /** from http://docs.closure-library.googlecode.com/git/local_closure_goog_uri_uri.js.source.html
   *
   * Removes dot segments in given path component, as described in
   * RFC 3986, section 5.2.4.
   *
   * @param {string} path A non-empty path component.
   * @return {string} Path component with removed dot segments.
   */
  removeDotSegments(path) {
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

  extractBasePath(file) {
    // work both in url ("/") and windows ("\", from file://d:\test\) notation
    const basePath = file.split(/[/\\]/);
    basePath[basePath.length - 1] = "";
    return basePath.join("/");
  }

  extractFileName(file) {
    return file.split(/[/\\]/).pop();
  }

  // Load file, parse and construct (.qml or .qml.js)
  loadFile(file, parentComponent = null) {
    // Create an anchor element to get the absolute path from the DOM
    if (!this.$basePathA) {
      this.$basePathA = document.createElement("a");
    }
    this.$basePathA.href = this.extractBasePath(file);
    this.$basePath = this.$basePathA.href;
    const fileName = this.extractFileName(file);
    const clazz = this.loadClass(this.$resolvePath(fileName));
    const component = this.loadQMLTree(clazz, parentComponent, file);
    console.log("loadFile success. LOADED : "+file);
    return component;
  }

  // parse and construct qml
  // file is not required; only for debug purposes
  // This function is only used by the QmlWeb tests
  loadQML(src, parentComponent = null, file = undefined) {
    return this.loadQMLTree(QmlWeb.parseQML(src, file), parentComponent, file);
  }

  loadQMLTree(clazz, parentComponent = null, file = undefined) {
    QmlWeb.engine = this;

    // Create and initialize objects
    const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
    const component = new QMLComponent({
      object: clazz,
      parent: parentComponent,
      context: this.rootContext
    });

    this.loadImports(clazz.$imports, undefined, component.importContextId);
    component.$basePath = this.$basePath;
    component.$imports = clazz.$imports; // for later use
    component.$file = file; // just for debugging

    this.rootObject = component.$createObject(parentComponent);
    if (this.rootObject.dom) {
      console.log(clazz.$name+" : DOM element FOUND ! Added to engine screen root element : "+this.dom.tagName+"#"+this.dom.id+"."+this.dom.className);
      this.domTarget.appendChild(this.rootObject.dom);
    } else {
      console.warn(clazz.$name+" : No DOM, it's a pure model object. Not added to screen root element : "+this.dom.tagName+"#"+this.dom.id+"."+this.dom.className);
    }

    this.operationState = QmlWeb.QMLOperationState.Idle;

    this.$initializePendingOps();

    this.start();

    this.updateGeometry();

    this.callCompletedSignals();

    return component;
  }

  // next 3 methods used in Qt.createComponent for qml files lookup
  // http://doc.qt.io/qt-5/qqmlengine.html#addImportPath

  addImportPath(dirpath) {
    this.userAddedImportPaths.push(dirpath);
  }

  /* Add this dirpath to be checked for components. This is the result of
   * something like:
   *
   * import "SomeDir/AnotherDirectory"
   *
   * The importContextId ensures it is only accessible from the file in which
   * it was imported. */
  addComponentImportPath(importContextId, dirpath, qualifier) {
    if (!this.componentImportPaths) {
      this.componentImportPaths = {};
    }
    if (!this.componentImportPaths[importContextId]) {
      this.componentImportPaths[importContextId] = {};
    }

    const paths = this.componentImportPaths[importContextId];

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

  importSearchPaths(importContextId) {
    if (!this.componentImportPaths) {
      return [];
    }
    const paths = this.componentImportPaths[importContextId];
    if (!paths) {
      return [];
    }
    return paths.unqualified || [];
  }

  qualifiedImportPath(importContextId, qualifier) {
    if (!this.componentImportPaths) {
      return "";
    }
    const paths = this.componentImportPaths[importContextId];
    if (!paths || !paths.qualified) {
      return "";
    }
    return paths.qualified[qualifier] || "";
  }

  setImportPathList(arrayOfDirs) {
    this.userAddedImportPaths = arrayOfDirs;
  }

  importPathList() {
    return this.userAddedImportPaths;
  }

  // `addModulePath` defines conrete path for module lookup
  // e.g. addModulePath("QtQuick.Controls", "http://example.com/controls")
  // will force system to `import QtQuick.Controls` module from
  // `http://example.com/controls/qmldir`

  addModulePath(moduleName, dirPath) {
    // Keep the mapping. It will be used in loadImports() function.
    // Remove trailing slash as it required for `readQmlDir`.
    this.userAddedModulePaths[moduleName] = dirPath.replace(/\/$/, "");
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

  loadImports(importsArray, currentFileDir = this.$basePath,
      importContextId) {
    if (!this.qmldirsContents) {
      this.qmldirsContents = {}; // cache

      // putting initial keys in qmldirsContents - is a hack. We should find a
      // way to explain to qmlweb, is this built-in module or qmldir-style
      // module.
      for (const module in QmlWeb.modules) {
        if (module !== "Main") {
          this.qmldirsContents[module] = { module:module };
        }
      }
    }

    if (!this.ctxQmldirs) {
      this.ctxQmldirs = {}; // resulting components lookup table
    }

    if (!importContextId) {
      throw new Error("loadImports   currentFileDir:"+currentFileDir+"  No importContextId:"+importContextId);
    }

    if (!importsArray || importsArray.length === 0) {
      return;
    }

    for (let i = 0; i < importsArray.length; i++) {
      this.loadImport(importsArray[i], currentFileDir, importContextId);
    }
  }

  loadImport(entry, currentFileDir, importContextId) {
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
      name = this.$resolvePath(name, currentFileDir);
      if (name[name.length - 1] === "/") {
        // remove trailing slash as it required for `readQmlDir`
        name = name.substr(0, name.length - 1);
      }
    }

    let content = this.qmldirsContents[name];
    // check if we have already loaded that qmldir file
    if (!content) {
      var qrcName;
      if (nameIsQualifiedModuleName && this.userAddedModulePaths[name]) {
        // 1. we have qualified module and user had configured path for that
        // module with this.addModulePath
        qrcName = this.userAddedModulePaths[name];
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
        const probableDirs = [currentFileDir].concat(this.importPathList());
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
      this.qmldirsContents[name] = content;
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
          this.addComponentImportPath(importContextId,
            `${entry[1]}/`, entry[3]);
        } else {
          this.addComponentImportPath(importContextId, `${name}/`);
        }
      }

      this.qmldirsContents[name] = "noqmldir";
      return;
    }

    // NOTE we copy it to current component namespace (import context):
    var qmldirs = this.ctxQmldirs[importContextId];
    if (!qmldirs) {
      this.ctxQmldirs[importContextId] = qmldirs = {};
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
    //this.qmldirsContents[name] = content;
  }

  resolveImport(name) {

    let file = this.$resolvePath(name);

    let component = this.components[file];
    let clazz;
    // TODO gz
    if (component) {
      clazz = component.object;
    }

    if (!clazz) {
      // If "name" was a full URL, "file" will be equivalent to name and this
      // will try and load the Component from the full URL, otherwise, this
      // doubles as checking for the file in the current directory.
      clazz = this.loadClass(file);
    }

    // If the Component is not found, and it is not a URL, look for "name" in
    // this context's importSearchPaths
    if (!clazz) {
      const nameIsUrl = this.$parseURI(name) !== undefined;
      if (!nameIsUrl) {
        const moreDirs = this.importSearchPaths(
          QmlWeb.executionContext.importContextId);
        for (let i = 0; i < moreDirs.length; i++) {
          file = `${moreDirs[i]}${name}`;
          clazz = this.loadClass(file);
          if (clazz) break;
        }
      }
    }

    return {clazz, file};
  }

  findClass(name, context) {
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
    let constructors = QmlWeb.perImportContextConstructors[context.importContextId];

    const classComponents = name.split(".");
    for (let ci = 0; ci < classComponents.length; ++ci) {
      const c = classComponents[ci];
      constructors = constructors[c];
      if (constructors === undefined) {
        break;
      }
    }

    if (constructors !== undefined) {
      return {clazzConstructor:constructors, classComponents:classComponents};
    } else {

      // 2) 3)preloaded qrc-s  4)
      const qmldirs = this.ctxQmldirs[context.importContextId];

      const qdirInfo = qmldirs ? qmldirs[name] : null;
      // Are we have info on that component in some imported qmldir files?

      /* This will also be set in applyProperties, but needs to be set here
       * for Qt.createComponent to have the correct context. */
      QmlWeb.executionContext = context;

      let filePath;
      if (qdirInfo) {
        filePath = qdirInfo.url;
      } else if (classComponents.length === 2) {
        const qualified = this.qualifiedImportPath(
          context.importContextId, classComponents[0]
        );
        filePath = `${qualified}${classComponents[1]}.qml`;
      } else {
        filePath = `${classComponents[0]}.qml`;
      }

      // 1) through engine.$resolvePath(name);
      let imp = this.resolveImport(filePath);

      imp.classComponents=classComponents;

      return imp;
    }
  }


  size() {
    return {
      width: this.rootObject.getWidth(),
      height: this.rootObject.getHeight()
    };
  }

  focusedElement() {
    return this.rootObject.$context.activeFocus;
  }

  //---------- Private Methods ----------

  $initKeyboard() {
    document.onkeypress = e => {
      let focusedElement = this.focusedElement();
      const event = QmlWeb.eventToKeyboard(e || widow.event);
      const eventName = QmlWeb.keyboardSignals[event.key];

      while (focusedElement && !event.accepted) {
        const backup = focusedElement.$context.event;
        focusedElement.$context.event = event;
        focusedElement.Keys.pressed(event);
        if (eventName) {
          focusedElement.Keys[eventName](event);
        }
        focusedElement.$context.event = backup;
        if (event.accepted) {
          e.preventDefault();
        } else {
          focusedElement = focusedElement.$parent;
        }
      }
    };

    document.onkeyup = e => {
      let focusedElement = this.focusedElement();
      const event = QmlWeb.eventToKeyboard(e || widow.event);

      while (focusedElement && !event.accepted) {
        const backup = focusedElement.$context.event;
        focusedElement.$context.event = event;
        focusedElement.Keys.released(event);
        focusedElement.$context.event = backup;
        if (event.accepted) {
          e.preventDefault();
        } else {
          focusedElement = focusedElement.$parent;
        }
      }
    };
  }

  /*_tick() {
    const now = Date.now();
    const elapsed = now - this._lastTick;
    this._lastTick = now;
    this._tickers.forEach(ticker => ticker(now, elapsed));
  }*/

  // Load resolved file, parse and construct as Component class (.qml)
  loadClass(file) {
    if (file in this.classes) {
      return this.classes[file];
    }

    const uri = this.$parseURI(file);
    if (!uri) {
      console.warn("QMLEngine.loadClass: Empty url :", file);
      return undefined;
    }

    let clazz;
    if (uri.scheme === "qrc:/") {
      let t0 = clazz;
      clazz = QmlWeb.qrc[uri.path];
      if (!clazz) {
        console.warn("QMLEngine.loadClass: Empty qrc entry :", uri.path);
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
        console.error("QMLEngine.loadClass: Failed to load:", file);
        return undefined;
      }

      console.log("QMLEngine.loadClass: Loading file:", file);
      clazz = QmlWeb.parseQML(src, file);
    }

    if (!clazz) {
      console.warn("QMLEngine.loadClass: Empty file :", file);
      return undefined;
    }

    if (clazz.$children.length !== 1) {
      console.error("QMLEngine.loadClass: Failed to load:", file,
        ": A QML component must only contain one root element!");
      return undefined;
    }

    clazz.$file = file;
    this.classes[file] = clazz;


    return clazz;
  }

  // Load resolved file and parse as JavaScript
  loadJS(file) {
    if (file in this.js) {
      return this.js[file];
    }

    const uri = this.$parseURI(file);
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

    this.js[file] = contextSetter;

    return contextSetter;
  }

  $registerStart(f) {
    this._whenStart.push(f);
  }

  $registerStop(f) {
    this._whenStop.push(f);
  }

  $addTicker(t) {
    this._tickers.push(t);

    if (this.operationState === QMLOperationState.Running) {
      $startTicker(t);
    }
  }

  $removeTicker(t) {
    const index = this._tickers.indexOf(t);
    if (index !== -1) {
      this._tickers.splice(index, 1);
    }
    if (this.operationState === QMLOperationState.Running) {
      $stopTicker(t);
    }
  }

  $startTicker(t) {
    if (!t.tickerId) {
      var interval = t.interval;
      if (!interval) {
        // Math.floor, causes bugs to timing?
        interval = Math.floor(1000/t.fps);
      }

      t.tickerId = setInterval(t.tick, interval);
    }
  }

  $stopTicker(t) {
    if (t.tickerId) {
      clearInterval(t.tickerId);
      delete t.tickerId;
    }
  }

  $initializePendingOps() {
    // Initialize property bindings
    // we use `while`, because $initializePendingOps may be called
    // recursive (because of Loader and/or createQmlObject )
    // +
    // Perform pending operations. Now we use it only to fire signals to slots
    // again, if pending evaluation error occured during an init-time event invocation.
    //
    // TODO Important! We are using 1 single queue for all the pending bound properties
    // and pending signals and register every event immediately when it's just occured.
    // So we keep the order as was when they initially occurred and now we're evaluating it
    // sequentially. We hope, this evaluation algorithm can reproduce the same evaluation
    // graph exactly, but I think, this logic have complex consequences.
    // Not very easy intellectual task to check that throroughly, for a later time...

    console.log("$initializePendingOps : "+this.pendingOperations.length);

    var i=0,a=0,a1=0,a2=0,a3=0,b=0,e=0;
    while (this.pendingOperations.length > 0) {
      const op = this.pendingOperations.shift();

      const property = op.property;

      try {
        if (property) {
          if (!property.binding) {
            // Probably, the binding was overwritten by an explicit value. Ignore.
            a1++;
            continue;
          }

          if (property.needsUpdate) {
            a2++;
            property.update();
          } else if (geometryProperties.indexOf(property.name) >= 0) {
            a3++;
            // It is possible that bindings with these names was already evaluated
            // during eval of other bindings but in that case $updateHGeometry and
            // $updateVGeometry could be blocked during their eval.
            // So we call them explicitly, just in case.
            const { obj, changed } = property;
            if (obj.$updateHGeometry &&
                changed.isConnected(obj, obj.$updateHGeometry)) {
              obj.$updateHGeometry(property.val, property.val, property.name);
            }
            if (obj.$updateVGeometry &&
                changed.isConnected(obj, obj.$updateVGeometry)) {
              obj.$updateVGeometry(property.val, property.val, property.name);
            }
          }
          a++;
        } else {
          op.fun.apply(op.thisObj, op.args);
          b++;
        }
      } catch (err) {
        e++;
        console.warn("pendingOperation #"+i+":"+op.info+"  err:"+err);
      }

      i++;
    }

    console.log("$initializePendingOps : done  total:"+i+" properties:"+a+"("+(a1+","+a2+","+a3)+") functions:"+b+" errors:"+e);
  }

  // This parses the full URL into scheme and path
  $parseURI(uri) {
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
  $parseURIwAuth(uri) {
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

  $parseURIlong(uri) {
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
  $resolvePath(file, basePath = this.$basePath) {
    // probably, replace :// with :/ ?
    if (!file || file.indexOf(":/") !== -1 || file.indexOf("data:") === 0 ||
      file.indexOf("blob:") === 0) {
      return file;
    }

    const basePathURI = this.$parseURI(basePath);
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
    path = this.removeDotSegments(path.replace(/([^:]\/)\/+/g, "$1"));

    return `${basePathURI.scheme}${basePathURI.authority}${path}`;
  }

  // Return a DOM-valid path to load the image (fileURL is an already-resolved
  // URL)
  $resolveImageURL(fileURL) {
    const uri = this.$parseURI(fileURL);
    // If we are within the resource system, look up a "real" path that can be
    // used by the DOM. If not found, return the path itself without the
    // "qrc:/" scheme.
    if (uri && uri.scheme === "qrc:/") {
      return QmlWeb.qrc[uri.path] || uri.path;
    }

    // Something we can't parse, just pass it through
    return fileURL;
  }

  callCompletedSignals() {
    // the while loop is better than for..in loop, because completedSignals
    // array might change dynamically when some completed signal handlers will
    // create objects dynamically via createQmlObject or Loader
    while (this.completedSignals.length > 0) {
      const handler = this.completedSignals.shift();
      handler();
    }
  }
}

QmlWeb.QMLEngine = QMLEngine;
