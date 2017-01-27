class QMLComponent {
  constructor(meta) {
    if (QmlWeb.constructors[meta.object.$class] === QMLComponent) {
      this.$metaObject = meta.object.$children;
      if (this.$metaObject instanceof Array) {
        if (this.$metaObject.length !== 1) {
          throw new Errror("Component should define 1 element : "+meta.object.$name+" "+meta.object.id);
        }
        this.$metaObject = this.$metaObject[0];
      }
      this.$metaObject.$name = meta.object.$name;
      this.$metaObject.$id = meta.object.id;
    } else {
      this.$metaObject = meta.object;
    }


    // no parent = is import root
    if (meta.isFromFile) {

      this.$jsImports = [];
      this.perImportContextConstructors = {};
      this.ctxQmldirs = {}; // resulting components lookup table
      this.componentImportPaths = {};

      const moduleImports = [];
      function _add_imp(importDesc) {
        if (/\.js$/.test(importDesc[1])) {
          this.$jsImports.push(importDesc);
        } else {
          moduleImports.push(importDesc);
        }
      }

      if (meta.object.$imports) {
        for (let i = 0; i < meta.object.$imports.length; ++i) {
          _add_imp(meta.object.$imports[i]);
        }
      }
      QmlWeb.preloadImports(this, moduleImports);
    } else {
      this.$jsImports = meta.component.$jsImports;
      this.perImportContextConstructors = meta.component.perImportContextConstructors;
      this.ctxQmldirs = meta.component.ctxQmldirs;
      this.componentImportPaths = meta.component.componentImportPaths;
    }
  }
  finalizeImports($context) {
    const engine = QmlWeb.engine;
    for (let i = 0; i < this.$jsImports.length; ++i) {
      const importDesc = this.$jsImports[i];
      const js = engine.loadJS($resolvePath(importDesc[1]));

      if (!js) {
        console.log("Component.finalizeImports: failed to import JavaScript",
          importDesc[1]);
        continue;
      }

      if (importDesc[3] !== "") {
        $context[importDesc[3]] = {};
        QmlWeb.importJavascriptInContext(js, $context[importDesc[3]]);
      } else {
        QmlWeb.importJavascriptInContext(js, $context);
      }
    }
  }
  $createObject(parent, properties = {}/*, context = this.$context  : is parent usually*/) {
    const engine = QmlWeb.engine;
    const oldState = engine.operationState;
    engine.operationState = QmlWeb.QMLOperationState.Init;
    // change base path to current component base path
    const bp = engine.$basePath;
    if (this.$basePath) engine.$basePath = this.$basePath;

    let item;
    try {
      if (!this) {
        throw new Error("No context passed to $createObject");
      }

      item = QmlWeb.construct({
        object: this.$metaObject,
        parent, // parent automatically forwards $context, see QObject.constructor(parent)
        component: this,
        isFromFile: this.isFromFile,
      });

      this.finalizeImports(item.$context);

      for (var propname in properties) {
        item[propname] = properties[propname];
      }

    } finally {
      // change base path back
      // TODO looks a bit hacky
      engine.$basePath = bp;

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
