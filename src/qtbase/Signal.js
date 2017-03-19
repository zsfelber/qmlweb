
class Connection {
  constructor($signal, slotObj, slot, type, thisObj) {
    this.index = $signal.connectedSlots.length;
    this.$signal = $signal;
    this.slotObj = slotObj;
    this.id = slotObj.$objectId;
    this.slot = slot;
    this.type = type;
    this.thisObj = thisObj?thisObj:slotObj;
  }

  disconnect(all) {
    this.$signal.disconnectConnection(this, all);
  };

  toString() {
    return "Conn:"+this.$signal.obj+".signal:"+this.$signal.$name+" -> "+
          (this.binding ? this.binding.toString():
          (this.slot ? this.slot.toString() : ""));
  };
}

class Signal {
  constructor(name, params = [], options = {}) {
    this.$engine = QmlWeb.getEngine();

    this.$objectId = this.$signalId = ++objectIds;
    this.$name = name;
    this.connectedSlots = [];
    this.obj = options.obj;
    this.params = params;
    this.options = options;

    this.signal = this.execute.bind(this);
    // avoid unnecassary funcion.bind (creating closures):
    this.signal.$signal = this;
    this.signal.connect = Signal.connectSignal;
    this.signal.disconnect = Signal.disconnectSignal;
    this.signal.isConnected = Signal.isSignalConnected;

    // TODO Fix Keys that don't have an obj for the signal
    if (this.obj && this.obj.$signals !== undefined) {
      this.obj.$signals[this.$signalId] = this.signal;
    }
  }

  // where this = "this".signal
  static connectSignal(...args) {
    return this.$signal.connect(...args);
  }
  // where this = "this".signal
  static disconnectSignal(...args) {
    return this.$signal.disconnect(...args);
  }
  // where this = "this".signal
  static isSignalConnected(...args) {
    return this.$signal.isConnected(...args);
  }

  execute(...args) {
    const pushed = QmlWeb.QMLProperty.pushEvalStack();
    try {
      // it may remove another item meanwhile, required to dup:
      const dupcs = this.connectedSlots.slice(0);
      for (const i in dupcs) {
        const desc = dupcs[i];
        var args2 = args.slice(0);
        if (desc.type & QMLSignalFlags.QueuedConnection) {
          Signal.$addQueued(desc, args2);
        } else {
          Signal.$execute(desc, args2);
        }
      }
    } finally {
      if (pushed) QmlWeb.QMLProperty.popEvalStack();
    }
  }
  connect(...args) {
    let type = QMLSignalFlags.AutoConnection;
    if (typeof args[args.length - 1] === "number") {
      type = args.pop();
    }
    if (type & QMLSignalFlags.UniqueConnection) {
      const con = this.isConnected(...args);
      if (con) {
        if (!con.uses) con.uses = 1;
        else con.uses++;
        return con;
      }
    }
    var connection;
    if (args.length === 1) {
      connection = new Connection(this, global, args[0], type);
    } else if (typeof args[1] === "string" || args[1] instanceof String) {
      if (args[0].$tidyupList && args[0] !== this.obj) {
        args[0].$tidyupList.push(this.signal);
      }
      const slot = args[0][args[1]];
      connection = new Connection(this, args[0], slot, type);
    } else {
      if (args[0].$tidyupList &&
        (!this.obj || args[0] !== this.obj && args[0] !== this.obj.$parent)
      ) {
        args[0].$tidyupList.push(this.signal);
      }
      connection = new Connection(this, args[0], args[1], type);
    }
    if (!connection.slot) {
      throw new Error("Missing slot for signal:"+this.$name+"  connection   slotObj:"+connection.slotObj);
    }

    if (type & QMLSignalFlags.ToFirst) {
      this.connectedSlots.unshift(connection);
    } else {
      this.connectedSlots.push(connection);
    }

    // Notify object of connect
    if (this.options.obj && this.options.obj.$connectNotify) {
      this.options.obj.$connectNotify(this.options);
    }
    return connection;
  }

  disconnect(...args) {
    // type meaning:
    //  1 = function, 2 = string
    //  3 = object with string method,  4 = object with function
    // No args means disconnect everything connected to this signal
    const callType = args.length === 1
      ? args[0] instanceof Function ? 1 : 2
      : typeof args[1] === "string" || args[1] instanceof String ? 3 : 4;
    let i = 0, j = 0;
    for (; i < this.connectedSlots.length; i++, j++) {
      //const { slot, slotObj } = this.connectedSlots[i];
      const connection = this.connectedSlots[i];
      if (
        args.length === 0 ||
        callType === 1 && connection.slot === args[0] ||
        callType === 2 && connection.id === args[0].$objectId ||
        callType === 3 && connection.id === args[0].$objectId && connection.slot === args[0][args[1]] ||
        connection.id === args[0].$objectId && connection.slot === args[1]
      ) {
        this.tidyupConnection(connection);
        // We have removed an item from the list so the indexes shifted one
        // backwards
        j--;
      } else if (i !== j) {
        this.connectedSlots[j] = connection;
      }
    }
    this.connectedSlots.length = j;

    // Notify object of disconnect
    if (this.options.obj && this.options.obj.$disconnectNotify) {
      this.options.obj.$disconnectNotify(this.options);
    }
  }
  isConnected(...args) {
    const callType = args.length === 1 ? 1
      : typeof args[1] === "string" || args[1] instanceof String ? 2 : 3;
    for (const i in this.connectedSlots) {
      const con = this.connectedSlots[i];
      if (callType === 1 && con.slot === args[0] ||
          callType === 2 && con.id === args[0].$objectId && con.slot === args[0][args[1]] ||
          con.id === args[0].$objectId && con.slot === args[1]
      ) {
        return con;
      }
    }
    return null;
  }

  tidyupConnection(connection) {
    if (connection.slotObj) {
      const index = connection.slotObj.$tidyupList.indexOf(this.signal);
      if (index >= 0) {
        connection.slotObj.$tidyupList.splice(index, 1);
      }
    }
  }

  disconnectConnection(connection, all) {
    var remove;
    if (all) remove = true;
    else if (con.uses) remove=!--con.uses;
    else remove = true;

    if (remove) {
      this.tidyupConnection(connection);

      this.connectedSlots.splice(connection.index, 1);
      for (var i = connection.index; i<this.connectedSlots.length; i++) {
        this.connectedSlots[i].index--;
      }

      // Notify object of disconnect
      if (this.options.obj && this.options.obj.$disconnectNotify) {
        this.options.obj.$disconnectNotify(this.options);
      }
    }
  }

  static signal(...args) {
    return (new Signal(...args)).signal;
  }

  static $execute(desc, args) {
    try {
      desc.slot.apply(desc.thisObj, args);
    } catch (err) {
      if (err instanceof QmlWeb.FatalError) throw err;
      const engine = desc.$signal.$engine;
      if (!(engine.operationState & QmlWeb.QMLOperationState.BeforeStart)
           || ((engine.operationState & QmlWeb.QMLOperationState.Init) && !err.ctType)) {
        if (desc.binding) {
          QmlWeb.warn("Signal : "+QmlWeb.objToStringSafe(desc.thisObj)+" . "+ desc.$signal.$name + (desc.slotObj!==desc.thisObj?" slotObj:" + QmlWeb.objToStringSafe(desc.slotObj):"") +" slot(autobound) error:", err);
        } else {
          QmlWeb.warn("Signal : "+QmlWeb.objToStringSafe(desc.thisObj)+" . "+ desc.$signal.$name + (desc.slotObj!==desc.thisObj?" slotObj:" + QmlWeb.objToStringSafe(desc.slotObj):"") +" slot(user function) error:", err);
        }
      } else if (engine.operationState & QmlWeb.QMLOperationState.Starting) {
        if (err.ctType === "UninitializedEvaluation")
          engine.currentPendingOp.warnings.push({loc:"$execute", desc, args, err})
          ;
        else
          engine.currentPendingOp.errors.push({loc:"$execute", desc, args, err});
      }
      err.srcdumpok = 1;
    }
  }

  static $addQueued(desc, args) {
    if (Signal.$queued.length === 0) {
      if (global.setImmediate) {
        global.setImmediate(Signal.$executeQueued);
      } else {
        global.setTimeout(Signal.$executeQueued, 0);
      }
    }
    Signal.$queued.push([desc, args]);
  }
  static $executeQueued() {
    // New queued signals should be executed on next tick of the event loop
    const queued = Signal.$queued;
    Signal.$queued = [];

    const pushed = QmlWeb.QMLProperty.pushEvalStack();
    try {
      for (const i in queued) {
        Signal.$execute(...queued[i]);
      }
    } finally {
      if (pushed) QmlWeb.QMLProperty.popEvalStack();
    }
  }
}

Signal.$queued = [];

QmlWeb.Signal = Signal;
