class QMLComponent {
  constructor(meta) {
    this.copyMeta(meta);
    // no component = is import root
    const engine = QmlWeb.engine;
    const loaderComponent = QmlWeb.engine.$component;

    this.$jsImports = [];
    this.moduleConstructors = {};
    this.ctxQmldirs = {}; // resulting components lookup table
    this.componentImportPaths = {};

    // NOTE making a new level of $context inheritance :
    // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
    // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
    // see also Object.create in classes.construct
    // see also Object.create in QMLContext.createChild
    if (loaderComponent) {
      this.meta.context = this.context = loaderComponent.context.createChild();
      console.warn("Component  "+loaderComponent.$file+" -> "+this.$file);
    } else {
      this.meta.context = this.context = engine.rootContext.createChild();
      console.warn("Component  "+this.$file);
    }

    if (!this.$basePath) {
      throw new Error("No component basePath present");
    }
    if (!this.context) {
      throw new Error("No component context");
    }
    if (!this.$file) {
      throw new Error("No component file");
    }

    const moduleImports = [];
    function _add_imp(importDesc) {
      if (/\.js$/.test(importDesc[1])) {
        this.$jsImports.push(importDesc);
      } else {
        moduleImports.push(importDesc);
      }
    }

    if (meta.clazz.$imports) {
      for (let i = 0; i < meta.clazz.$imports.length; ++i) {
        _add_imp(meta.clazz.$imports[i]);
      }
    }
    QmlWeb.preloadImports(this, moduleImports);
  }

  copyMeta(meta) {
    this.meta = {};
    if (meta.$file !== meta.clazz.$file) {
      throw new Error("Assertion failed. $file-s in Component and class differ :  meta.$file:"+meta.$file+" === meta.clazz.$file:"+meta.clazz.$file);
    }

    QmlWeb.helpers.copy(this.meta, meta.clazz);

    if (QmlWeb.constructors[meta.clazz.$class] === QMLComponent) {
      var metaObject = meta.clazz.$children;
      if (metaObject instanceof Array) {
        if (metaObject.length !== 1) {
          throw new Errror("Component should define 1 element : "+meta.clazz.$name+" "+meta.clazz.id);
        }
        QmlWeb.helpers.copy(this.meta, metaObject[0]);
      }
    }

    this.$id = this.meta.$id;
    this.$name = this.meta.$name;
    this.$file = this.meta.$file;
    //this.$imports = this.meta.$imports; // for later use
    if (this.$file) {
      this.$basePath = QmlWeb.extractBasePath(this.$file);
    }

  }

  finalizeImports() {
    const engine = QmlWeb.engine;
    for (let i = 0; i < this.$jsImports.length; ++i) {
      const importDesc = this.$jsImports[i];
      const js = QmlWeb.loadJS($resolvePath(importDesc[1], this.$basePath));

      if (!js) {
        console.log("Component.finalizeImports: failed to import JavaScript",
          importDesc[1]);
        continue;
      }

      if (importDesc[3] !== "") {
        this.$object.$context[importDesc[3]] = {};
        QmlWeb.importJavascriptInContext(js, this.$object.$context[importDesc[3]]);
      } else {
        QmlWeb.importJavascriptInContext(js, this.$object.$conteximpt);
      }
    }
  }

  $createObject(parent, properties = {}) {
    const engine = QmlWeb.engine;
    const oldState = engine.operationState;
    engine.operationState = QmlWeb.QMLOperationState.Init;

    // change base path to current component base path
    var prevComponent = QmlWeb.engine.$component;
    QmlWeb.engine.$component = this;

    let item;
    try {
      // NOTE recursive call to initialize the class then its super  ($createObject -> constuct -> $createObject -> constuct ...) :
      // parent automatically forwards context, see QObject.constructor(parent)
      // no parent -> this.context   see initMeta
      item = QmlWeb.construct(this.meta, parent, this);
      this.finalizeImports();

      for (var propname in properties) {
        item[propname] = properties[propname];
      }

    } finally {
      QmlWeb.engine.$component = prevComponent;
      engine.operationState = oldState;
    }
    return item;
  }
  createObject(parent, properties = {}) {
    const item = this.$createObject(parent, properties);
    const QMLItem = QmlWeb.getConstructor("QtQuick", "2.0", "Item");

    if (item instanceof QMLItem) {
      item.$properties.parent.set(parent, QmlWeb.QMLProperty.ReasonInitPrivileged);
    }

    return item;
  }
  static getAttachedObject() {
    // see QMLEngine.js for explanation how it is used.
    if (!this.$Component) {
      this.$Component = new QmlWeb.QObject(this);
      this.$Component.completed = QmlWeb.Signal.signal("completed", []);
      QmlWeb.engine.completedSignals.push(this.$Component.completed);

      this.$Component.destruction = QmlWeb.Signal.signal("destruction", []);
    }
    return this.$Component;
  }
}

QmlWeb.registerQmlType({
  global: true,
  module: "QtQml",
  name: "Component",
  versions: /.*/,
  baseClass: "QtObject",
  constructor: QMLComponent
});
