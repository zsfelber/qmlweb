class Repeater extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Repeater);

    //this.parent = meta.parent;
    // TODO: some (all ?) of the components including Repeater needs to know own
    // parent at creation time. Please consider this major change.

    this.$completed = false;
    this.$items = []; // List of created items

    this.modelChanged.connect(this, this.$onModelChanged);
    this.delegateChanged.connect(this, this.$onDelegateChanged);
    this.containerChanged.connect(this, this.$onContainerChanged);
  }
  repeaterContainer() {
    return this.container;
  }
  itemAt(index) {
    return this.$items[index];
  }
  $onModelChanged() {
    this.$applyModel();
  }
  $onDelegateChanged() {
    //TODO gz  this.delegate.init();
    this.$applyModel();
  }
  $onContainerChanged() {
    this.$applyModel();
  }
  $getModel() {
    //const QMLListModel = QmlWeb.getConstructor("QtQuick", "2.0", "ListModel");
    return this.model instanceof ListModel ?
            this.model.$model :
            this.model;
  }
  $applyModel() {
    const container = this.repeaterContainer();
    if (!this.delegate || !container) {
      return;
    }

    const model = this.$getModel();
    if (model instanceof QmlWeb.JSItemModel) {
      const flags = QmlWeb.Signal.UniqueConnection;
      model.dataChanged.connect(this, this.$_onModelDataChanged, flags);
      model.rowsInserted.connect(this, this.$_onRowsInserted, flags);
      model.rowsMoved.connect(this, this.$_onRowsMoved, flags);
      model.rowsRemoved.connect(this, this.$_onRowsRemoved, flags);
      model.modelReset.connect(this, this.$_onModelReset, flags);

      this.$removeChildren(0, this.$items.length);
      this.$insertChildren(0, model.rowCount());
    } else if (typeof model === "number") {
      if (this.$items.length > model) {
        // have more than we need
        this.$removeChildren(model, this.$items.length);
      } else {
        // need more
        this.$insertChildren(this.$items.length, model);
      }
    } else if (model instanceof Array) {
      this.$removeChildren(0, this.$items.length);
      this.$insertChildren(0, model.length);
    }
    this.count = this.$items.length;
  }
  $_onModelDataChanged(startIndex, endIndex, roles) {
    const model = this.$getModel();
    const roleNames = roles || model.roleNames;
    for (let index = startIndex; index <= endIndex; index++) {
      const item = this.$items[index];
      const modelData = item.$properties.model;
      // // TODO gz obsolete : scope
      // const scope = {
      //   $object: item,
      //   $context: this.model.$context
      // };
      for (const i in roleNames) {
        const roleName = roleNames[i];
        const roleData = model.data(index, roleName);
        item.$properties[roleName].set(
          roleData,
          QmlWeb.QMLPropertyFlags.ReasonInitPrivileged,
          item
        );
        modelData[roleName] = roleData;
      }
      item.$properties.model.set(
        modelData,
        QmlWeb.QMLPropertyFlags.ReasonInitPrivileged,
        item
      );
    }
  }
  $_onRowsInserted(startIndex, endIndex) {
    this.$insertChildren(startIndex, endIndex);
    this.count = this.$items.length;
  }
  $_onRowsMoved(sourceStartIndex, sourceEndIndex, destinationIndex) {
    const vals = this.$items.splice(
      sourceStartIndex,
      sourceEndIndex - sourceStartIndex
    );
    for (let i = 0; i < vals.length; i++) {
      this.$items.splice(destinationIndex + i, 0, vals[i]);
    }
    const smallestChangedIndex = sourceStartIndex < destinationIndex ?
                                  sourceStartIndex :
                                  destinationIndex;
    for (let i = smallestChangedIndex; i < this.$items.length; i++) {
      this.$items[i].index = i;
    }
  }
  $_onRowsRemoved(startIndex, endIndex) {
    this.$removeChildren(startIndex, endIndex);
    for (let i = startIndex; i < this.$items.length; i++) {
      this.$items[i].index = i;
    }
    this.count = this.$items.length;
  }
  $_onModelReset() {
    this.$applyModel();
  }
  $insertChildren(startIndex, endIndex) {
    if (endIndex <= 0) {
      this.count = 0;
      return;
    }

    const QMLOperationState = QmlWeb.QMLOperationState;
    const createProperty = QmlWeb.createProperty;
    const model = this.$getModel();
    const container = this.repeaterContainer();
    let index;
    const engine = QmlWeb.getEngine();
    var prevEvalObj = QmlWeb.engine.$evaluatedObj;
    try {
      QmlWeb.engine.$evaluatedObj = container;

      var outallchanges = {};
      for (index = startIndex; index < endIndex; index++) {

        const newItem = this.delegate.createObject(container, {}, outallchanges);
        const np = newItem.$properties;
        createProperty("int", newItem, "index", { initialValue: index });
        // // TODO gz obsolete : scope
        // const scope = {
        //   $object: newItem,
        //   $context: ...
        // };

        if (typeof model === "number" || model instanceof Array) {
          if (typeof np.modelData === "undefined") {
            createProperty("variant", newItem, "modelData");
          }
          const value = model instanceof Array ?
                        model[index] :
                        typeof model === "number" ? index : "undefined";
          np.modelData.set(value, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged,
                                            newItem);
        } else {
          // QML exposes a "model" property in the scope that contains all role
          // data.
          const modelData = {};
          for (let i = 0; i < model.roleNames.length; i++) {
            const roleName = model.roleNames[i];
            if (typeof np[roleName] === "undefined") {
              createProperty("variant", newItem, roleName);
            }
            const roleData = model.data(index, roleName);
            modelData[roleName] = roleData;
            np[roleName].set(
              roleData, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged,
              newItem
            );
          }
          if (typeof np.model === "undefined") {
            createProperty("variant", newItem, "model");
          }
          np.model.set(
            modelData, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged,
            newItem
          );
        }

        this.$items.splice(index, 0, newItem);

        // parent must be set after the roles have been added to newItem scope in
        // case we are outside of QMLOperationState.System and parentChanged has
        // any side effects that result in those roleNames being referenced.
        // ($createObject does this)
        //newItem.parent = this.parent;

      }
    } finally {
      QmlWeb.engine.$evaluatedObj = prevEvalObj;
    }

    if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
      // We don't call those on first creation, as they will be called
      // by the regular creation-procedures at the right time.
      QmlWeb.engine.processPendingOperations();
    }

    if (outallchanges.children) {
      container.childrenChanged();
    }
    if (outallchanges.resources) {
      container.resourcesChanged();
    }
    if (outallchanges[container.$defaultProperty]) {
      const prop = container.$properties[container.$defaultProperty];
      prop.changed(prop.value, prop.value, container.$defaultProperty);
    }

    for (let i = endIndex; i < this.$items.length; i++) {
      this.$items[i].index = i;
    }
  }
  $removeChildren(startIndex, endIndex) {
    const removed = this.$items.splice(startIndex, endIndex - startIndex);
    for (const index in removed) {
      removed[index].destroy();
    }
  }
}

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Repeater",
  versions: /.*/,
  baseClass: "Item",
  properties: {
    delegate: "Component",
    // 0 to remove "Uninitialized" state
    model: { type: "variant", initialValue: 0 },
    count: "int"
  },
  signals: {
    _childrenInserted: []
  },
  defaultProperty: "delegate",
  constructor:Repeater
});

