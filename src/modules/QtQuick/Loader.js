QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Loader",
  versions: /.*/,
  baseClass: "Item",
  properties: {
    active: { type: "bool", initialValue: true },
    asynchronous: "bool",
    item: "var",
    progress: "real",
    // null to remove "Uninitialized" state
    source: { type: "url", initialValue: null },
    // null to remove "Uninitialized" state
    sourceComponent: { type: "Component", initialValue: null },
    status: { type: "enum", initialValue: 1 }
  },
  signals: {
    loaded: []
  },
}, class Loader extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, Loader);

    this.$sourceUrl = "";

    this.activeChanged.connect(this, this.$onActiveChanged);
    this.sourceChanged.connect(this, this.$onSourceChanged);
    this.sourceComponentChanged.connect(this, this.$onSourceComponentChanged);
    this.widthChanged.connect(this, this.$updateGeometry);
    this.heightChanged.connect(this, this.$updateGeometry);
  }
  $onActiveChanged() {
    if (!this.active) {
      this.$unload();
      return;
    }
    if (this.source) {
      this.$onSourceChanged(this.source);
    } else if (this.sourceComponent) {
      this.$onSourceComponentChanged(this.sourceComponent);
    }
  }
  $onSourceChanged(fileName) {
    // TODO
    // if (fileName == this.$sourceUrl && this.item !== undefined) return;
    if (!this.active) return;
    this.$unload();

    if (!fileName) {
      this.sourceComponent = null;
      this.$sourceUrl = fileName;
      return;
    }

    var prevComponent = QmlWeb.engine.$component;

    try {
      QmlWeb.engine.$component = this.$component;
      const url = QmlWeb.resolveBasePath(fileName);
      let $class = url.path + url.file;
      if (/\.qml$/.test($class)) {
        $class = $class.substring(0, $class.length-4);
      }

      const qmlComponent = QmlWeb.createComponent({
        clazz: {$class, $file: fileName}
      }, QmlWeb.QMLComponentFlags.Nested);

      this.$sourceUrl = fileName;
      // in QMLProperty.setVal  :: } else if (val instanceof Object  ... this.value = val;
      // resulting   this.sourceComponent===qmlComponent
      this.sourceComponent = qmlComponent;

      if (!qmlComponent || this.sourceComponent !== qmlComponent) {
        throw new QmlWeb.AssertionError("Assertion failed Loader: !qmlComponent || this.sourceComponent!==qmlComponent : "+this.toString(true));
      }
    } finally {
      QmlWeb.engine.$component = prevComponent;
    }
  }

  $onSourceComponentChanged(newItem) {
    if (!this.active) return;
    this.$unload();

    if (!newItem) {
      this.item = null;
      return;
    }

    this.item = newItem.$createObject(this/*parent*/);
    this.$updateGeometry();

    if (!(QmlWeb.engine.operationState & QmlWeb.QMLOperationState.BeforeStart)) {
      // We don't call those on first creation, as they will be called
      // by the regular creation-procedures at the right time.
      QmlWeb.engine.processPendingOperations();
    }
    if (this.item) {
      this.loaded();
    }
  }
  setSource(url, options) {
    this.$sourceUrl = url;
    this.props = options;
    this.source = url;
  }
  $unload() {
    if (!this.item) return;
    this.item.$delete();
    this.item.parent = undefined;
    this.item = undefined;
  }
  $callOnCompleted(child) {
    child.Component.completed();
    const QtObject = QmlWeb.QtObject;
    for (let i = 0; i < child.$tidyupList.length; i++) {
      if (child.$tidyupList[i] instanceof QtObject) {
        this.$callOnCompleted(child.$tidyupList[i]);
      }
    }
  }
  $updateGeometry() {
    // Loader size doesn't exist
    if (!this.width) {
      this.width = this.item ? this.item.width : 0;
    } else if (this.item) {
      // Loader size exists
      this.item.width = this.width;
    }

    if (!this.height) {
      this.height = this.item ? this.item.height : 0;
    } else if (this.item) {
      // Loader size exists
      this.item.height = this.height;
    }
  }
});
