class JSItemModel {
  constructor() {
    this.roleNames = [];

    const Signal = QmlWeb.Signal;
    this.dataChanged = Signal.signal("dataChanged", [
      { type: "int", name: "startIndex" },
      { type: "int", name: "endIndex" }
    ]);
    this.rowsInserted = Signal.signal("rowsInserted", [
      { type: "int", name: "startIndex" },
      { type: "int", name: "endIndex" }
    ]);
    this.rowsMoved = Signal.signal("rowsMoved", [
      { type: "int", name: "sourceStartIndex" },
      { type: "int", name: "sourceEndIndex" },
      { type: "int", name: "destinationIndex" }
    ]);
    this.rowsRemoved = Signal.signal("rowsRemoved", [
      { type: "int", name: "startIndex" },
      { type: "int", name: "endIndex" }
    ]);
    this.modelReset = Signal.signal("modelReset");
  }

  setRoleNames(names) {
    this.roleNames = names;
  }
}

QmlWeb.JSItemModel = JSItemModel;
