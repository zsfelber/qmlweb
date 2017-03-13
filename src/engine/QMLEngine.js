// There can only be one running QMLEngine.
// This variable points to the currently running engine.
QmlWeb.engine = null;

QmlWeb.useShadowDom = true;


// QML engine. EXPORTED.
class QMLEngine {
  constructor(element, opts={}) {
    if (QmlWeb.engine) {
      throw new Error("Instantiating multiple engines in same global/window object's environment is not supported. (Or call engine.destroy() first.)");
    }

    QmlWeb.engine = this;
    this.logging = opts.logging || QmlWeb.QMLEngineLogging.Full;

    //----------Public Members----------

    this.setDom(element);

    // Cached component trees (post-QmlWeb.convertToEngine)
    this.classes = {};

    // Cached parsed JS files (post-QmlWeb.jsparse)
    this.js = {};

    // Current operation state of the engine (Idle, init, etc.)
    this.operationState = QmlWeb.QMLOperationState.Idle;

    // List of properties whose values are bindings. For internal use only.
    // +
    // List of operations to perform later after init. For internal use only.
    this.pendingOperations = {stack:[], map:{}};

    // Root object of the engine
    this.rootObject = null;
    this.rootContext = {};
    this._rootContext = new QmlWeb.QMLContext(this.rootContext);

    // Base path of qml engine (used for resource loading)
    // used in tests only
    this.$basePathUrl = "";

    // Module import paths overrides
    this.userAddedModulePaths = {};

    // Stores data for setImportPathList(), importPathList(), and addImportPath
    this.userAddedImportPaths = [];

    //----------Private Members---------

    // Ticker resource id and ticker callbacks
    this._tickers = {};
    //this._lastTick = Date.now();

    // Callbacks for stopping or starting the engine
    this._whenStop = {};
    this._whenStart = {};

    // Keyboard management
    this.$initKeyboard();

    //----------Construct----------

    window.addEventListener("resize", () => this.updateGeometry());
  }

  destroy() {
    try {
      this.stop();
    } catch (err) {
      console.error("engine destroy errorr : ", this, err);
    }

    var cleanup = QmlWeb.helpers.mergeObjects(this._whenStart, this._whenStop, this._tickers);

    while (!cleanup.isEmpty()) {
      try {
        for (const i in cleanup) {
          try {
            const val = cleanup[i];
            if (val.destroy) {
              val.$delete();
            }
          } finally {
            delete cleanup[i];
          }
          break;
        }
      } catch (err) {
        console.error("engine destroy errorr : ", this, err);
      }
    }

    QmlWeb.engine = null;
  }

  setDom(element) {
    //this.fps = 60;
    // Math.floor, causes bugs to timing?
    //this.$interval = Math.floor(1000 / this.fps);
    this.dom = element || document.body;

    // Target for the DOM children
    this.domTarget = this.dom;
    if (this.dom && QmlWeb.useShadowDom && this.dom.attachShadow) {
      this.domTarget = this.dom.attachShadow({ mode: "open" });
    }

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
    const QMLOperationState = QmlWeb.QMLOperationState;
    if (!(this.operationState & QMLOperationState.Running)) {
      this.operationState |= QMLOperationState.Running;
      //this._tickerId = setInterval(this._tick.bind(this), this.$interval);
      //this._tickers.forEach(ticker => ticker(now, elapsed));
      for (const i in this._whenStart) {
        const val = this._whenStart[i];
        try {
          val();
        } catch (err) {
          if (err instanceof QmlWeb.FatalError) throw err;
          if (!err.ctType) {
            QmlWeb.warn("Error in startup script : ", err);
          } else {
            QmlWeb.warn(err.ctType+" error in startup script.");
          }
        }
      }
      for (const i in this._tickers) {
        const val = this._tickers[i];
        try {
          this.$startTicker(val);
        } catch (err) {
          if (err instanceof QmlWeb.FatalError) throw err;
          if (!err.ctType) {
            QmlWeb.warn("Startup error in ticker : ", err);
          } else {
            QmlWeb.warn(err.ctType+" : Startup error in ticker.");
          }
        }
      }
    }
  }

  // Stop the engine
  stop() {
    const QMLOperationState = QmlWeb.QMLOperationState;
    if (this.operationState & QMLOperationState.Running) {
      //clearInterval(this._tickerId);
      for (const i in this._tickers) {
        const val = this._tickers[i];
        this.$stopTicker(val);
      }
      this.operationState &= ~QMLOperationState.Running;
      for (const i in this._whenStop) {
        const val = this._whenStop[i];
        val();
      }
    }
  }


  // Load file, parse and construct (.qml or .qml.js)
  loadFile(file, parent = null, operationFlags = 0, serverWsAddress, isClientSide) {
    var wsUrl, webSocket;
    if (operationFlags & QmlWeb.QMLOperationState.Remote) {
      if (serverWsAddress !== undefined) {
        if (/^\d+$/.test(serverWsAddress)) {
          var url = QmlWeb.$parseUrl(window.location.href);
          wsUrl = "ws://"+url.hostname+":"+(serverWsAddress?serverWsAddress:url.port);
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

    // used only in tests externally:
    this.$basePathUrl = QmlWeb.resolveBasePath(file);

    // TODO gz resolveClass  += engine.containers[...]
    const respath = QmlWeb.$resolvePath(null, this.$basePathUrl);
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
    // default is 0 : Idle
    var committedState = this.operationState;

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
      committedState = this.operationState;

      this.updateGeometry();
      this.operationState &= ~QmlWeb.QMLOperationState.System;
      committedState = this.operationState;

      return this.rootObject.$component;

    } finally {
      // reset to initial state : this intended to remove "System" flag (usually but stacking logic should work)
      this.operationState = committedState;
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


  $registerStart(owner, f) {
    this._whenStart[owner.$objectId] = f;
  }

  $registerStop(owner, f) {
    this._whenStop[owner.$objectId] = f;
  }

  $removeStart(owner) {
    delete this._whenStart[owner.$objectId];
  }

  $removeStop(owner) {
    delete this._whenStop[owner.$objectId];
  }

  $addTicker(t) {
    this._tickers[t.$objectId] = t;

    if (this.operationState & QMLOperationState.Running) {
      this.$startTicker(t);
    }
  }

  $removeTicker(t) {
    delete this._tickers[t.$objectId];

    if (this.operationState & QMLOperationState.Running) {
      this.$stopTicker(t);
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
      if (t.$tickStarted) {
        t.$tickStarted();
      }
    }
  }

  $stopTicker(t) {
    if (t.tickerId) {
      clearInterval(t.tickerId);
      if (t.$tickStopped) {
        t.$tickStopped();
      }
      delete t.tickerId;
    }
  }

  addPendingOp(itm) {
    let itms = this.pendingOperations.map[itm.opId];
    if (!itms) {
      this.pendingOperations.map[itm.opId] = itms = [];
      this.pendingOperations.stack.push(itms);
      itms.opId = itm.opId;
    }
    itms.push(itm);
    return itms;
  }

  processOp(op) {
    const oldP = this.currentPendingOp;
    this.currentPendingOp = op;

    op.errors = [];
    op.warnings = [];
    let mode=":"+op.opId;

    const property = op.property;

    try {
      if (property) {
        this.a++;
        if (property.updateState & QmlWeb.QMLPropertyState.Updating) {
          this.ae++;
          mode+=":ae";
          op.errors.push("Property state is invalid : initialization failed : "+property);
        } else {

          property.$set(op.newVal, op.oldVal, op.flags, op.valParentObj, op);

          this.a1++;
          mode+=":a";
        }
      } else {
        this.b++;
        mode+=":b";
        op.fun.apply(op.thisObj, op.args);
      }

      if (op.errors.length) {
        this.e++;
        this.error["#"+this.i+mode+"!!"+op.info] = op;
        op.err = op.errors[0];
        if (op.err.err !== undefined) {
          op.errprop = op.err.prop;
          op.err = op.err.err;
        }
      } else if (op.warnings.length) {
        this.w++;
        this.warning["#"+this.i+mode+"!"+op.info] = op;
        op.warn = op.warnings[0];
        if (op.warn.err !== undefined) {
          op.warnprop = op.warn.prop;
          op.warn = op.warn.err;
        }
      } else {
        this.info["#"+this.i+mode+":"+op.info] = op;
      }

    } catch (err) {
      if (err instanceof QmlWeb.FatalError) throw err;
      if (err.ctType==="UninitializedEvaluation") {
        this.w++;
        this.warning["#"+this.i+mode+"!"+op.info] = op;
      } else {
        this.e++;
        this.error["#"+this.i+mode+"!!"+op.info] = op;
      }
      op.err = err;
    } finally {
      this.currentPendingOp = oldP;
    }

    this.i++;
  }

  processSinglePendingOperation(op) {
    if (op.length)  {
      opId = op[0].opId;
      delete this.pendingOperations.map[opId];
      op.forEach(this.processOp, this);
      op.splice(0, op.length);
      op.$cleared = true;
    }
  }

  processPendingOperations() {
    // Initialize property bindings
    //
    // onCompleted signals
    //
    // all pending operataions at once during "Starting" stage
    //

    QmlWeb.log("processPendingOperations : " + this.pendingOperations.stack.length);

    this.i=0; this.a=0; this.ae=0; this.a1=0; this.b=0; this.e=0; this.w=0;
    this.info = {}; this.warning = {}; this.error = {};
    while (this.pendingOperations.stack.length > 0) {
      let op = this.pendingOperations.stack.shift();
      this.processSinglePendingOperation(op);
    }

    QmlWeb.log("processPendingOperations : done  total:"+this.i+" properties:"+this.a+"("+(this.a1+","+this.ae)+") functions:"+this.b+"  Info:",this.info, "   Warning("+this.w+"):",this.warning, "   Error("+this.e+"):",this.error);
  }

  static dumpErr() {
    QmlWeb.warn(this.message);
    QmlWeb.warn(this.stack);
  }
}

QmlWeb.QMLEngine = QMLEngine;
