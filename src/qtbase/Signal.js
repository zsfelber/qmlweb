let signalIds = 0;

class Signal {
  constructor(name, params = [], options = {}) {
    this.$signalId = ++signalIds;
    this.$name = name;
    this.connectedSlots = [];
    this.obj = options.obj;
    this.options = options;

    this.signal = (...args) => this.execute(...args);
    this.signal.$signal = this;
    this.signal.parameters = params;
    this.signal.connect = this.connect.bind(this);
    this.signal.disconnect = this.disconnect.bind(this);
    this.signal.isConnected = this.isConnected.bind(this);

    // TODO Fix Keys that don't have an obj for the signal
    if (this.obj && this.obj.$signals !== undefined) {
      this.obj.$signals[this.$signalId] = this.signal;
    }
  }
  execute(...args) {
    QmlWeb.QMLProperty.pushEvalStack();
    try {
      for (const i in this.connectedSlots) {
        const desc = this.connectedSlots[i];
        var args2 = args.slice(0);
        if (desc.type & Signal.QueuedConnection) {
          Signal.$addQueued(desc, args2);
        } else {
          Signal.$execute(desc, args2);
        }
      }
    } finally {
      QmlWeb.QMLProperty.popEvalStack();
    }
  }
  connect(...args) {
    let type = Signal.AutoConnection;
    if (typeof args[args.length - 1] === "number") {
      type = args.pop();
    }
    if (type & Signal.UniqueConnection) {
      const con = this.isConnected(...args);
      if (con) {
        if (!con.uses) con.uses = 1;
        else con.uses++;
        return con;
      }
    }
    var connection;
    if (args.length === 1) {
      connection = { thisObj: global, slotObj: global, slot: args[0], type };
    } else if (typeof args[1] === "string" || args[1] instanceof String) {
      if (args[0].$tidyupList && args[0] !== this.obj) {
        args[0].$tidyupList.push(this.signal);
      }
      const slot = args[0][args[1]];
      connection = { thisObj: args[0], slotObj: args[0], slot, type };
    } else {
      if (args[0].$tidyupList &&
        (!this.obj || args[0] !== this.obj && args[0] !== this.obj.$parent)
      ) {
        args[0].$tidyupList.push(this.signal);
      }
      connection = { thisObj: args[0], slotObj: args[0], slot: args[1], type };
    }
    if (!connection.slot) {
      throw new Error("Missing slot for signal:"+this.$name+"  connection   slotObj:"+connection.slotObj);
    }

    connection.disconnect = function(all) {
      connection.signal.disconnectConnection(connection, all);
    };
    connection.index = this.connectedSlots.length;
    connection.signal = this;
    connection.toString = function() {
      return "Conn:"+connection.signal.obj+".signal:"+connection.signal.$name+" -> "+
            (connection.binding ? connection.binding.toString():
            (connection.slot ? connection.slot.toString() : ""));
    };

    this.connectedSlots.push(connection);

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
        callType === 2 && connection.slotObj === args[0] ||
        callType === 3 && connection.slotObj === args[0] && connection.slot === args[0][args[1]] ||
        connection.slotObj === args[0] && connection.slot === args[1]
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
          callType === 2 && con.slotObj === args[0] && con.slot === args[0][args[1]] ||
          con.slotObj === args[0] && con.slot === args[1]
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
      if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)
           || ((QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Init) && !err.ctType)) {
        if (desc.binding) {
          console.warn("Signal : "+QmlWeb.objToStringSafe(desc.thisObj)+" . "+ desc.signal.$name + (desc.slotObj!==desc.thisObj?" slotObj:" + QmlWeb.objToStringSafe(desc.slotObj):"") +" slot(autobound) error:", err);
        } else {
          console.warn("Signal : "+QmlWeb.objToStringSafe(desc.thisObj)+" . "+ desc.signal.$name + (desc.slotObj!==desc.thisObj?" slotObj:" + QmlWeb.objToStringSafe(desc.slotObj):"") +" slot(user function) error:", err);
        }
      } else if (QmlWeb.engine.operationState & QmlWeb.QMLOperationState.Starting) {
        QmlWeb.engine.currentPendingOp.errors.push({loc:"$execute", desc, args, err});
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

    QmlWeb.QMLProperty.pushEvalStack();
    try {
      for (const i in queued) {
        Signal.$execute(...queued[i]);
      }
    } finally {
      QmlWeb.QMLProperty.popEvalStack();
    }
  }
}

Signal.$queued = [];

Signal.AutoConnection = 0;
Signal.DirectConnection = 1;
Signal.QueuedConnection = 2;
Signal.UniqueConnection = 128;

QmlWeb.Signal = Signal;
