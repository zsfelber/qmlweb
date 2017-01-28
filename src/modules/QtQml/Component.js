class QMLComponent {
  constructor(meta) {
    if (QmlWeb.constructors[meta.clazz.$class] === QMLComponent) {
      this.$metaObject = meta.clazz.$children;
      if (this.$metaObject instanceof Array) {
        if (this.$metaObject.length !== 1) {
          throw new Errror("Component should define 1 element : "+meta.clazz.$name+" "+meta.clazz.id);
        }
        this.$metaObject = QmlWeb.helpers.mergeObjects(this.$metaObject[0]);
      }
      this.$metaObject.$name = meta.clazz.$name;
      this.$metaObject.$id = meta.clazz.id;
    } else {
      this.$metaObject = QmlWeb.helpers.mergeObjects(meta.clazz);
      this.$metaObject = meta.clazz;
    }
    this.clazz = meta.clazz;
    this.$imports = meta.clazz.$imports; // for later use
    this.loaderComponent = meta.loaderComponent;
    this.$file = meta.$file;
    this.$basePath = this.$file?QmlWeb.extractBasePath(this.$file):null;
    if (this.$file !== this.clazz.$file) {
      throw new Error("Assertion failed. $file-s in Component and class differ :  this.$file:"+this.$file+" === this.clazz.$file:"+this.clazz.$file);
    }

    // no component = is import root
    if (meta.loaderComponent) {
      this.$jsImports = meta.loaderComponent.$jsImports;
      this.moduleConstructors = meta.loaderComponent.moduleConstructors;
      this.ctxQmldirs = meta.loaderComponent.ctxQmldirs;
      this.componentImportPaths = meta.loaderComponent.componentImportPaths;
      this.context = meta.loaderComponent.context;
      this.$name = meta.clazz.$name;
      if (!this.$basePath) {
        this.$basePath = meta.loaderComponent.$basePath;
      }
      if (!this.$basePath) {
        throw new Error("No component basePath present");
      }
      if (!this.context) {
        throw new Error("No context in loader Component");
      }
      if (!this.$file) {
        throw new Error("Unsupported, no file with loader Component");
      }
      // TODO gz  verify
      // NOTE it just opened another QML document (and this is the superclass of loader):
      this.isNewContextLevel = this.$file !== meta.loaderComponent.$file;
      if (this.isNewContextLevel) {
        this.context = this.context.create();
        if ((meta.clazz.$class+".qml") !== meta.loaderComponent.$name) {
          throw new Error("Assertion failed. Not a superclass loader but file changed? :  meta.clazz.$class.qml:"+(meta.clazz.$class+".qml")+" === meta.loaderComponent.$name:"+meta.loaderComponent.$name);
        }
      }

      this.$metaObject.context = this.context;

    } else {

      this.$jsImports = [];
      this.moduleConstructors = {};
      this.ctxQmldirs = {}; // resulting components lookup table
      this.componentImportPaths = {};
      this.context = engine.rootContext.create();
      this.isNewContextLevel = true;
      if (!this.$basePath) {
        throw new Error("No component basePath present");
      }
      if (!this.context) {
        throw new Error("No context");
      }

      this.$metaObject.context = this.context;

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
      // no parent -> this.$metaObject.context   see initMeta
      item = QmlWeb.construct(this.$metaObject, parent, this);
      item.$component = this;
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
