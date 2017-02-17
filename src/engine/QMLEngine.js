// There can only be one running QMLEngine.
// This variable points to the currently running engine.
QmlWeb.engine = null;

QmlWeb.useShadowDom = true;

const geometryProperties = {
  "width":1, "height":1, "fill":1, "x":1, "y":1, "left":1, "right":1, "top":1, "bottom":1
};


// QML engine. EXPORTED.
class QMLEngine {
  constructor(element, opts={}) {
    QmlWeb.engine = this;
    this.logging = opts.logging || QmlWeb.QMLEngineLogging.Full;

    //----------Public Members----------

    //this.fps = 60;
    // Math.floor, causes bugs to timing?
    //this.$interval = Math.floor(1000 / this.fps);
    this.dom = element || document.body;

    // Target for the DOM children
    this.domTarget = this.dom;
    if (this.dom && QmlWeb.useShadowDom && this.dom.attachShadow) {
      this.domTarget = this.dom.attachShadow({ mode: "open" });
    }

    // Cached component trees (post-QmlWeb.convertToEngine)
    this.classes = {};

    // Cached parsed JS files (post-QmlWeb.jsparse)
    this.js = {};

    // List of Component.completed signals
    this.completedSignals = [];

    // Current operation state of the engine (Idle, init, etc.)
    this.operationState = QmlWeb.QMLOperationState.Idle;

    // List of properties whose values are bindings. For internal use only.
    // +
    // List of operations to perform later after init. For internal use only.
    this.pendingOperations = {stack:[], map:{}};

    // Root object of the engine
    this.rootObject = null;
    this.rootContext = new QmlWeb.QMLContext();

    // Base path of qml engine (used for resource loading)
    // used in tests only
    this.$basePathUrl = "";

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

    if (this.dom) {
      this.css = QmlWeb.createStyle(this.dom.style);
      // No QML stuff should stand out the root element
      QmlWeb.setStyle(this.css, "overflow", "hidden");

      // Needed to make absolute positioning work
      if (!this.css.position) {
        const style = window.getComputedStyle(this.dom);
        if (style.getPropertyValue("position") === "static") {
          QmlWeb.setStyle(this.css, "position", "relative");
          QmlWeb.setStyle(this.css, "top", "0px");
          QmlWeb.setStyle(this.css, "left", "0px");
        }
      }
    }

    window.addEventListener("resize", () => this.updateGeometry());
  }

  //---------- Public Methods ----------

  updateGeometry() {
    // we have to call `this.implicitHeight =` and `this.implicitWidth =`
    // each time the root element changes it's geometry
    // to reposition child elements of qml scene
    let width;
    let height;
    if (this.dom === document.body) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      const style = window.getComputedStyle(this.dom);
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
    if (!(this.operationState & QMLOperationState.Running)) {
      this.operationState |= QMLOperationState.Running;
      //this._tickerId = setInterval(this._tick.bind(this), this.$interval);
      //this._tickers.forEach(ticker => ticker(now, elapsed));
      this._whenStart.forEach(function(val) {
        try {
          val();
        } catch (err) {
          if (!err.ctType) {
            QmlWeb.warn("Error in startup script : ", err);
          } else {
            QmlWeb.warn(err.ctType+" error in startup script.");
          }
        }
      });
      this._tickers.forEach(function(val) {
        try {
          this.$startTicker(val);
        } catch (err) {
          if (!err.ctType) {
            QmlWeb.warn("Startup error in ticker : ", err);
          } else {
            QmlWeb.warn(err.ctType+" : Startup error in ticker.");
          }
        }
      });
    }
  }

  // Stop the engine
  stop() {
    const QMLOperationState = QmlWeb.QMLOperationState;
    if (this.operationState & QMLOperationState.Running) {
      //clearInterval(this._tickerId);
      this._tickers.forEach(ticker => $stopTicker(ticker));
      this.operationState &= ~QMLOperationState.Running;
      this._whenStop.forEach(callback => callback());
    }
  }


  // Load file, parse and construct (.qml or .qml.js)
  loadFile(file, parent = null, operationFlags = 0, serverWsAddress, isClientSide) {
    var wsUrl, webSocket;
    if (operationFlags & QmlWeb.QMLOperationState.Remote) {
      if (serverWsAddress !== undefined) {
        if (/^\d+$/.test(serverWsAddress)) {
          var uri = QmlWeb.$parseURIlong(window.location.href);
          wsUrl = "ws://"+uri.host+":"+(serverWsAddress?serverWsAddress:uri.port);
        } else {
          if (/^ws:[/]/.test(serverWsAddress)) {
            wsUrl = serverWsAddress;
          }
        }
        if (!wsUrl) {
          QmlWeb.error("Invalid server websockets address : "+serverWsAddress+". Should be a ws port or 'ws:/...' url.")
        }
      }

      if (wsUrl) {
        QmlWeb.log("Connecting to ws server : "+wsUrl);
        webSocket = new WebSocket(wsUrl);
        webSocket.onopen = function(evt) {
          QmlWeb.log(wsUrl+" : Connection open ...");
          webSocket.send(JSON.stringify({init:"hello UULord 012"}));
        };
        webSocket.onmessage = function(evt) {
          var data = JSON.parse(event.data);
          QmlWeb.log( wsUrl+" : Received Message: ", data);
        };
        webSocket.onclose = function(evt) {
          QmlWeb.log(wsUrl+" : Connection closed.");
        };
      }
    }

    const x = QmlWeb.resolveBasePath(file);
    // used in tests only
    this.$basePathUrl = x;
    const fileName = extractFileName(file);
    // TODO gz resolveClass  += engine.containers[...]
    const respath = QmlWeb.$resolvePath(fileName, x);
    const clazz = QmlWeb.resolveClass(respath);
    const component = this.loadQMLTree(clazz, parent, file, operationFlags, serverWsAddress, isClientSide, webSocket);
    QmlWeb.log("loadFile success. LOADED : "+file);
    return component;
  }

  // parse and construct qml
  // file is not required; only for debug purposes
  // This function is only used by the QmlWeb tests
  loadQML(src, parent = null, file = undefined, operationFlags = 0, serverWsAddress, isClientSide, webSocket) {
    return this.loadQMLTree(QmlWeb.parseQML(src, file), parent, file, operationFlags, serverWsAddress, isClientSide, webSocket);
  }

  loadQMLTree(clazz, parent = null, file = undefined, operationFlags = 0, serverWsAddress, isClientSide, webSocket) {
    QmlWeb.engine = this;
    // default is 0 : Idle
    var prevState = this.operationState;

    this.operationState |= operationFlags | QmlWeb.QMLOperationState.SystemInit;

    try {
      // Create and initialize objects
      // TODO gz undefined->component.$basePathUrl

      this.rootObject = QmlWeb.createComponentAndElement(
                    {clazz: clazz, $file: file}, parent,
                    QmlWeb.QMLComponentFlags.Root | QmlWeb.QMLComponentFlags.LoadImports);

      this.rootObject.$component.serverWsAddress = serverWsAddress;
      this.rootObject.$component.isClientSide = isClientSide;
      this.rootObject.$component.webSocket = webSocket;


      if (this.dom) {
        if (this.rootObject.dom) {
          QmlWeb.log(clazz.$name+" : DOM element FOUND ! Added to engine screen root element : "+this.dom.tagName+"#"+this.dom.id+"."+this.dom.className);
          this.domTarget.appendChild(this.rootObject.dom);
        } else {
          QmlWeb.log(clazz.$name+" : No DOM, it's a pure model object. Not added to screen root element : "+this.dom.tagName+"#"+this.dom.id+"."+this.dom.className);
        }
      }

      this.operationState &= ~QmlWeb.QMLOperationState.Init;
      this.operationState |= QmlWeb.QMLOperationState.Starting;

      this.processPendingOperations();

      this.operationState &= ~QmlWeb.QMLOperationState.Starting;

      this.start();

      this.updateGeometry();

      return this.rootObject.$component;

    } finally {
      // reset to initial state : this intended to remove "System" flag (usually but stacking logic should work)
      this.operationState = prevState;
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
      const event = QmlWeb.eventToKeyboard(e || window.event);
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
      const event = QmlWeb.eventToKeyboard(e || window.event);

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

    if (this.operationState & QMLOperationState.Running) {
      $startTicker(t);
    }
  }

  $removeTicker(t) {
    const index = this._tickers.indexOf(t);
    if (index !== -1) {
      this._tickers.splice(index, 1);
    }
    if (this.operationState & QMLOperationState.Running) {
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

  processPendingOperations() {
    // Initialize property bindings
    //
    // onCompleted signals
    //
    // all pending operataions at once during "Starting" stage
    //

    QmlWeb.log("processPendingOperations : "+this.pendingOperations.length);

    var i=0,a=0,ae=0,a1=0,a2=0,b=0,e=0,w=0;
    let info = {}, warning = {}, error = {};
    while (this.pendingOperations.stack.length > 0) {
      const op = this.pendingOperations.stack.shift();
      op.errors = [];
      op.warnings = [];
      this.currentPendingOp = op;
      let mode="";
      if (op.opId) {
        mode=":"+op.opId;
        delete this.pendingOperations.map[op.opId];
      }

      const property = op.property;

      try {
        if (property) {
          a++;
          if (property.updateState & QmlWeb.QMLPropertyState.Updating) {
            ae++;
            mode+=":ae";
            op.errors.push("Property state is invalid : update has not finished : "+property);
          } else {

            property.update(op.flags, op.declaringItem, op.oldVal);

            if (geometryProperties[property.name]) {
              a2++;
              mode+=":a2";
              // It is possible that bindings with these names was already evaluated
              // during eval of other bindings but in that case $updateHGeometry and
              // $updateVGeometry could be blocked during their eval.
              // So we call them explicitly, just in case.
              const { obj, changed } = property;
              if (obj.$updateHGeometry &&
                  changed.isConnected(obj, obj.$updateHGeometry)) {
                obj.$updateHGeometry(property.value, property.value, property.name);
              }
              if (obj.$updateVGeometry &&
                  changed.isConnected(obj, obj.$updateVGeometry)) {
                obj.$updateVGeometry(property.value, property.value, property.name);
              }
            } else {
              a1++;
              mode+=":a1";
            }
          }
        } else {
          b++;
          mode+=":b";
          op.fun.apply(op.thisObj, op.args);
        }

        if (op.errors.length) {
          e++;
          error["#"+i+mode+"!!"+op.info] = op;
          op.err = op.errors[0];
          if (op.err.err !== undefined)
            op.err = op.err.err;
        } else if (op.warnings.length) {
          w++;
          warning["#"+i+mode+"!"+op.info] = op;
          op.warn = op.warnings[0];
          if (op.warn.err !== undefined)
            op.warn = op.warn.err;
        } else {
          info["#"+i+mode+":"+op.info] = op;
        }

      } catch (err) {
        if (err.ctType==="UninitializedEvaluation") {
          w++;
          warning["#"+i+mode+"!"+op.info] = op;
        } else {
          e++;
          error["#"+i+mode+"!!"+op.info] = op;
        }
        op.err = err;
      }

      i++;
    }

    QmlWeb.log("processPendingOperations : done  total:"+i+" properties:"+a+"("+(a1+","+a2+","+ae)+") functions:"+b+"  Info:",info, "   Warning("+w+"):",warning, "   Error("+e+"):",error);
  }

  static dumpErr() {
    QmlWeb.warn(this.message);
    QmlWeb.warn(this.stack);
  }
}

QmlWeb.QMLEngine = QMLEngine;
