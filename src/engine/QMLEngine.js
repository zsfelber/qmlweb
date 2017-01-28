// There can only be one running QMLEngine.
// This variable points to the currently running engine.
QmlWeb.engine = null;

QmlWeb.useShadowDom = true;
let contextIds = 0;

const geometryProperties = [
  "width", "height", "fill", "x", "y", "left", "right", "top", "bottom"
];

class QMLContext {
  constructor() {
    this.$contextId = ++contextIds;
  }

  nameForObject(obj) {
    for (const name in this) {
      if (this[name] === obj) {
        return name;
      }
    }
    return undefined;
  }

  create(owner) {
    const newContext = Object.create(this);
    newContext.$contextId = ++contextIds;
    newContext.$parent = this;
    newContext.$owner = owner;
    return newContext;
  }
}


// QML engine. EXPORTED.
class QMLEngine {
  constructor(element) {
    QmlWeb.engine = this;

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


  // Load file, parse and construct (.qml or .qml.js)
  loadFile(file, parentComponent = null) {
    // Create an anchor element to get the absolute path from the DOM
    if (!this.$basePathA) {
      this.$basePathA = document.createElement("a");
    }
    this.$basePathA.href = QmlWeb.extractBasePath(file);
    this.$basePath = this.$basePathA.href;
    const fileName = extractFileName(file);
    const clazz = QmlWeb.loadClass(QmlWeb.$resolvePath(fileName, this.$basePathA.href));
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

    const newContext = this.rootContext.create();
    newContext.$elements = {};
    newContext.$elementoverloads = {};
    newContext.$elementoverloadsnoalias = {};

    // Create and initialize objects
    const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
    const component = new QMLComponent({
      clazz: clazz,
      parent: parentComponent,
      context: newContext,
      isFromFile: true
    });

    // TODO gz undefined->component.$basePath
    QmlWeb.loadImports(clazz.$imports, component);
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
    newContext.$owner = this.rootObject;
    QmlWeb.setupGetter(newContext, "$ownerString", this.rootObject.toString.bind(this.rootObject));
    newContext.$component = component;
    newContext.$componentFile = component.$file;


    this.operationState = QmlWeb.QMLOperationState.Idle;

    this.$initializePendingOps();

    this.start();

    this.updateGeometry();

    this.callCompletedSignals();

    return component;
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
