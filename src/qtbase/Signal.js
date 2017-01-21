class Signal {
  constructor(name, params = [], options = {}) {
    this.$name = name;
    this.connectedSlots = [];
    this.obj = options.obj;
    this.options = options;

    this.signal = (...args) => this.execute(...args);
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
      if (desc.type & Signal.QueuedConnection) {
        Signal.$addQueued(desc, args);
      } else {
        Signal.$execute(desc, args);
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
      if (this.isConnected(...args)) {
        return;
      }
    }
    var connection;
    if (args.length === 1) {
      connection = { thisObj: global, slot: args[0], type };
    } else if (typeof args[1] === "string" || args[1] instanceof String) {
      if (args[0].$tidyupList && args[0] !== this.obj) {
        args[0].$tidyupList.push(this.signal);
      }
      const slot = args[0][args[1]];
      connection = { thisObj: args[0], slot, type };
    } else {
      if (args[0].$tidyupList &&
        (!this.obj || args[0] !== this.obj && args[0] !== this.obj.$parent)
      ) {
        args[0].$tidyupList.push(this.signal);
      }
      connection = { thisObj: args[0], slot: args[1], type };
    }
    if (!connection.slot) {
      throw new Error("Missing slot for signal:"+this.$name+"  connection   thisObj:"+connection.thisObj);
    }

    connection.disconnect = function() {
      this.removeConnection(connection);
    };
    connection.index = this.connectedSlots.length;
    connection.signal = this;
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
      //const { slot, thisObj } = this.connectedSlots[i];
      const connection = this.connectedSlots[i];
      if (
        args.length === 0 ||
        callType === 1 && connection.slot === args[0] ||
        callType === 2 && connection.thisObj === args[0] ||
        callType === 3 && connection.thisObj === args[0] && connection.slot === args[0][args[1]] ||
        connection.thisObj === args[0] && connection.slot === args[1]
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
      const { slot, thisObj } = this.connectedSlots[i];
      if (callType === 1 && slot === args[0] ||
          callType === 2 && thisObj === args[0] && slot === args[0][args[1]] ||
          thisObj === args[0] && slot === args[1]
      ) {
        return true;
      }
    }
    return false;
  }

  tidyupConnection(connection) {
    if (connection.thisObj) {
      const index = connection.thisObj.$tidyupList.indexOf(this.signal);
      if (index >= 0) {
        connection.thisObj.$tidyupList.splice(index, 1);
      }
    }
  }

  removeConnection(connection) {
    tidyupConnection(connection);

    this.connectedSlots.splice(connection.index, 1);
    for (var i = connection.index; i<this.connectedSlots.length; i++) {
      this.connectedSlots[i].index--;
    }

    // Notify object of disconnect
    if (this.options.obj && this.options.obj.$disconnectNotify) {
      this.options.obj.$disconnectNotify(this.options);
    }
  }

  static signal(...args) {
    return (new Signal(...args)).signal;
  }

  static $execute(desc, args) {
    try {
      desc.slot.apply(desc.thisObj, args);
    } catch (err) {
      console.error("Signal :" + desc.signal.$name + "  thisObj:" + desc.thisObj+"  slot error:", err.message, err,
        Function.prototype.toString.call(desc.slot)
      );
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
