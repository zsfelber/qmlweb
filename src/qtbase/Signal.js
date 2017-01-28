class Signal {
  constructor(name, params = [], options = {}) {
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
      this.obj.$signals.push(this.signal);
    }
  }
  execute(...args) {
    QmlWeb.QMLProperty.pushEvalStack();
    for (const i in this.connectedSlots) {
      const desc = this.connectedSlots[i];
      var args2 = args.slice(0);
      if (desc.type & Signal.QueuedConnection) {
        Signal.$addQueued(desc, args2);
      } else {
        Signal.$execute(desc, args2);
      }
    }
    QmlWeb.QMLProperty.popEvalStack();
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
      connection = { signalObj: global, slot: args[0], type };
    } else if (typeof args[1] === "string" || args[1] instanceof String) {
      if (args[0].$tidyupList && args[0] !== this.obj) {
        args[0].$tidyupList.push(this.signal);
      }
      const slot = args[0][args[1]];
      connection = { signalObj: args[0], slot, type };
    } else {
      if (args[0].$tidyupList &&
        (!this.obj || args[0] !== this.obj && args[0] !== this.obj.$parent)
      ) {
        args[0].$tidyupList.push(this.signal);
      }
      connection = { signalObj: args[0], slot: args[1], type };
    }
    if (!connection.slot) {
      throw new Error("Missing slot for signal:"+this.$name+"  connection   signalObj:"+connection.signalObj);
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
      //const { slot, signalObj } = this.connectedSlots[i];
      const connection = this.connectedSlots[i];
      if (
        args.length === 0 ||
        callType === 1 && connection.slot === args[0] ||
        callType === 2 && connection.signalObj === args[0] ||
        callType === 3 && connection.signalObj === args[0] && connection.slot === args[0][args[1]] ||
        connection.signalObj === args[0] && connection.slot === args[1]
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
          callType === 2 && con.signalObj === args[0] && con.slot === args[0][args[1]] ||
          con.signalObj === args[0] && con.slot === args[1]
      ) {
        return con;
      }
    }
    return null;
  }

  tidyupConnection(connection) {
    if (connection.signalObj) {
      const index = connection.signalObj.$tidyupList.indexOf(this.signal);
      if (index >= 0) {
        connection.signalObj.$tidyupList.splice(index, 1);
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
      if (desc.arglen) {
        if (args.length >= desc.arglen) {
          throw new Error("Too many arguments for signal call : "+args.length+" expected:"+(desc.arglen-1));
        } else {
          for (var i = args.length; i<desc.arglen-1; i++) {
            args.push(undefined);
          }
          args.push(desc);
        }
      }

      desc.slot.apply(desc.thisObj, args);
    } catch (err) {
      if (err.ctType === "PendingEvaluation") {
        //console.warn("PendingEvaluation : Signal :" + desc.signal.$name + "  signalObj:" + desc.signalObj+"  pending operation:", err.message);
        QmlWeb.engine.pendingOperations.push({
          fun:desc.slot,
          thisObj:desc.thisObj,
          args:args,
          info:"Pending signal (waiting to initialization).",
          connection:desc,
          reason:err
        });
      } else {
        if (desc.binding) {
          console.warn("Signal :" + desc.signal.$name + "  signalObj:" + desc.signalObj+"  slot(autobound) error:", err.message, err, err.srcdumpok?" srcdump:ok":" "+desc.binding.toString());
        } else {
          console.warn("Signal :" + desc.signal.$name + "  signalObj:" + desc.signalObj+"  slot(user function) error:", err.message, err, err.srcdumpok?" srcdump:ok":" "+desc.slot.toString());
        }
      }
      err.srcdumpok = 1;
      if (QmlWeb.engine.operationState !== QmlWeb.QMLOperationState.Running) {
        throw err;
      }
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
    for (const i in queued) {
      Signal.$execute(...queued[i]);
    }
    QmlWeb.QMLProperty.popEvalStack();
  }
}

Signal.$queued = [];

Signal.AutoConnection = 0;
Signal.DirectConnection = 1;
Signal.QueuedConnection = 2;
Signal.UniqueConnection = 128;

QmlWeb.Signal = Signal;
