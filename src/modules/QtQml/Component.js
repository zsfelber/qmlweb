
class QMLComponent {
  constructor(meta, flags, loaderComponent) {
    this.$engine = QmlWeb.getEngine();

    this.$objectId = this.$componentId = ++objectIds;
    this.$properties = {};
    this.$engine.initMeta(this, {}, QMLComponent);

    this.copyMeta(meta, flags);

    this.flags = flags;
    this.createFlags = this.flags & (QmlWeb.QMLComponentFlags.Root|QmlWeb.QMLComponentFlags.Nested|QmlWeb.QMLComponentFlags.Super);
    this.elementFlags = this.flags & QmlWeb.QMLComponentFlags.Element;
    this.cntPendingCompletions = 0;

    const engine = this.$engine;
    // no component = is import root
    const evalObj = QmlWeb.$evaluatedObj;
    if (!loaderComponent && evalObj) loaderComponent = evalObj.$component;
    this.loaderComponent = loaderComponent;

    // !!! see QMLBinding
    this.$component = this;
    this.$root = this.loaderComponent ? this.loaderComponent.$root : this;

    if (this.flags & QmlWeb.QMLComponentFlags.Nested && this.loaderComponent) {

      // Nested item top level uses loader Component imports:
      this.redirectImports(this.loaderComponent);

    } else {

      if (this.moduleConstructors) {
        throw new QmlWeb.AssertionError("Assertion failed. Super/Root Component : imports filled.  "+this);
      }

      this.initImports();
    }

    if (this.$file) {
      if (!this.$basePathUrl) {
        throw new QmlWeb.AssertionError("Assertion failed. No component basePath present.  "+this);
      }
    }
    if (!this.moduleConstructors) {
      throw new QmlWeb.AssertionError("Assertion failed. Component : no imports.  "+this);
    }

    //QmlWeb.log(this.$context.toString());
  }

  copyMeta(meta, flags) {
    var cons;
    this.meta = {};
    this.$on = meta.$on;
    if (meta.clazz) {
      if (meta.$file === undefined) {
        meta.$file = meta.clazz.$file;
      } else if (meta.clazz.$file) {
        //  // url -> string
        //  meta.clazz.$file = meta.clazz.$file.toString();

        if (meta.$file !== meta.clazz.$file) {
          const uri1 = this.$engine.$parseUrl(meta.$file, true), uri2 = this.$engine.$parseUrl(meta.clazz.$file, true);
          if (!uri1 || !uri2 || uri1.path !== uri2.path) {
            if (!QmlWeb.isTesting || !uri1 || !uri2 || (uri1.path !== "/"+uri2.path && uri2.path !== "/"+uri1.path && uri1.path !== "/base"+uri2.path && uri2.path !== "/base"+uri1.path)) {
              console.warn((QmlWeb.isTesting?"testing  ":"")+"$file-s in Component and class differ :  meta.$file:'"+meta.$file+"' === meta.clazz.$file:'"+meta.clazz.$file+"'  paths:"+(uri1?uri1.path:"<null>")+" vs "+(uri2?uri2.path:"<null>"));
            }
          }
        }
      }

      QmlWeb.helpers.mergeInPlace(this.meta, meta.clazz);
      cons = QmlWeb.constructors[this.meta.$class];
    } else {
      if (meta.$file) {
        throw new Error("QML class or constructor not found : "+meta.$file);
      }

      QmlWeb.helpers.mergeInPlace(this.meta, meta);
      if (this.meta.$class !== "Component" || this.meta._constructor !== QMLComponent) {
        throw new QmlWeb.AssertionError("Assertion failed. Component element $class:"+meta.$class+" !== 'Component' || QMLComponent !== "+(this.meta._constructor?this.meta._constructor.name:"<null>"));
      }
      cons = this.meta._constructor;
    }

    if (cons === QMLComponent) {
      if (flags & QmlWeb.QMLComponentFlags.Flat) {
        throw new Errror("Flat Component should be a sole QMLMetaElement : "+this);
      }

      var metachild = this.meta.$children;
      if (metachild instanceof Array) {
        if (metachild.length !== 1) {
          throw new Errror("Component should define 1 element : "+this.meta.$name+"("+this.meta.$class+") "+this.meta.id);
        }
        metachild = metachild[0];
      }
      if (!(metachild instanceof QMLMetaElement)) {
        throw new Errror("Component's 'children' should be a sole QMLMetaElement : "+this);
      }

      QmlWeb.helpers.mergeInPlace(this.meta, metachild);
    }

    this.meta.$component = this;
    if (this.meta.$on!==this.$on) {
      if (this.$on) {
        if (this.meta.$on) {
          throw new AssertionError("Component #"+this.$componentId+" meta.$on conflict : "+this.$on+" vs "+this.meta.$on);
        } else {
          this.meta.$on = this.$on;
        }
      } else {
        this.$on = this.meta.$on;
      }
    }

    this.$id = this.meta.id;
    this.$name = this.meta.$name;
    this.$file = this.meta.$file;
    this.$imports = this.meta.$imports;
    if (this.$file) {
      this.$basePathUrl = this.$engine.resolveBasePath(this.$file);
    }

  }

  initImports() {
    this.$jsImports = [];
    this.moduleConstructors = Object.create(QmlWeb.constructors);
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

    if (this.$imports) {
      for (let i = 0; i < this.$imports.length; ++i) {
        _add_imp.call(this, this.$imports[i]);
      }
    }

    this.$engine.preloadImports(this, moduleImports);

    if (this.flags & QmlWeb.QMLComponentFlags.LoadImports) {
      // TODO gz  undefined -> component.$basePathUrl  from createQmlObject
      this.$engine.loadImports(this, this.$imports);
    }
  }

  redirectImports(sourceComponent) {
    //QmlWeb.warn("redirectImports : binding imports...  "+this+"  ==> "+sourceComponent);
    if (this.boundImportComponent) {
      QmlWeb.warn("redirectImports : rebind imports of : "+this+"  from: "+sourceComponent);
    }
    if (this.boundImportComponent === sourceComponent) {
      return ;
    }

    if (this.$jsImports&&this.$jsImports.length ||
        this.moduleConstructors&&!QmlWeb.isEmpty(this.moduleConstructors) ||
        this.ctxQmldirs&&!QmlWeb.isEmpty(this.ctxQmldirs) ||
        this.componentImportPaths&&!QmlWeb.isEmpty(this.componentImportPaths) ) {
      QmlWeb.warn("redirectImports : imports already loaded, of : "+this+", now rebinding imports to another Component : "+sourceComponent);
    }

    this.boundImportComponent = sourceComponent;

    if (sourceComponent) {
      if (!this.$basePathUrl0) {
        // Save
        this.$jsImports0 = this.$jsImports;
        this.moduleConstructors0 = this.moduleConstructors;
        this.ctxQmldirs0 = this.ctxQmldirs; // resulting components lookup table
        this.componentImportPaths0 = this.componentImportPaths;
        this.$basePathUrl0 = sourceComponent.$basePathUrl;
      }
      this.$jsImports = Object.create(sourceComponent.$jsImports);
      this.moduleConstructors = Object.create(sourceComponent.moduleConstructors);
      this.ctxQmldirs = Object.create(sourceComponent.ctxQmldirs); // resulting components lookup table
      this.componentImportPaths = Object.create(sourceComponent.componentImportPaths);
      this.$basePathUrl = sourceComponent.$basePathUrl;
    } else {
      // Restore
      this.$jsImports = this.$jsImports0;
      this.moduleConstructors = this.moduleConstructors0;
      this.ctxQmldirs = this.ctxQmldirs0; // resulting components lookup table
      this.componentImportPaths = this.componentImportPaths0;
      this.$basePathUrl = sourceComponent.$basePathUrl0;
    }
  }

  loadJsImports() {
    for (let i = 0; i < this.$jsImports.length; ++i) {
      const importDesc = this.$jsImports[i];

      const uri = this.$engine.$resolvePath(importDesc[1], this.$basePathUrl);
      const jsBinding = this.$engine.importJavascript(uri, importDesc[3]);

      if (!jsBinding) {
        QmlWeb.error("Component.loadJsImports: failed to import JavaScript", importDesc[1]);
      }
    }
  }


  $createObject(parent, properties = {}) {
    const engine = this.$engine;

    const oldFlags = this.flags;
    const oldElementFlags = this.elementFlags;
    const oldCreateFlags = this.createFlags;
    // change base path to current component base path
    const oldState = engine.operationState;
    const prevEvalObj = QmlWeb.$evaluatedObj;

    let item;
    try {

      this.status = QmlWeb.Component.Loading;

      // Lazy init :
      if (!this.createFlags) {
        if (parent) {
          this.createFlags = QmlWeb.QMLComponentFlags.Nested;
          this.elementFlags |= QmlWeb.QMLComponentFlags.Element;

          // (1) Nested item top level uses loader Component imports  see(2) :
          this.redirectImports(this.loaderComponent);

        } else {
          this.createFlags = QmlWeb.QMLComponentFlags.Root;
          // (2) Clear import redirections if any (may be after (1) ) :
          this.redirectImports(null);
        }
        this.flags |= this.createFlags;
      }

      if ( this.flags & QmlWeb.QMLComponentFlags.Nested ) {

        // NOTE on the top of a Nested Component's loader hierarchy, we have to insert 1 extra level of Components into
        // chains, changing $class from the "superclass" to the current again (but with Super Component flag):
        // No infinite loop, because component.flags is not Nested the next time  :

        if (this.meta.$name && this.meta.$name !== this.meta.$class+".qml") {
          throw new Error("Nested Component meta should not define a superclass other than (meta.$name : "+this.meta.$name+")  super: meta.$class:"+this.meta.$class);
        }
        this.$name = this.meta.$name = this.meta.$class + ".qml";

        //var cl = /(^.*?)\.qml/.exec(this.meta.$name)[1];
        //var cl = this.meta.$class;
        //QmlWeb.log("Nested Element top Component inserted  $class =  superclass:"+this.meta.$class+" -> actual:"+cl);
        //this.$class = this.meta.$class = cl;
      }

      engine.operationState |= QmlWeb.QMLOperationState.System;


      // NOTE recursive call to initialize the class then its super  ($createObject -> constuct -> $createObject -> constuct ...) :
      // parent automatically forwards context, see QObject.constructor(parent)
      // no parent -> this.context   see initMeta
      item = engine.construct(this.meta, parent, this.createFlags|this.elementFlags);
      QmlWeb.helpers.mergeInPlace(item, properties);

      // invoked either this or one from >@see also< classes.constructSuper
      if (item.hasOwnProperty("$attachedComponent")) {
        QObject.pendingComplete(item);
        this.cntPendingCompletions++;
      } else {
        this.status = QmlWeb.Component.Ready;
      }

    } catch (err) {
      //QmlWeb.warn("Cannot create Object : parent:"+parent+"  ctx:"+this.context+"  "+err.message);
      this.status = QmlWeb.Component.Error;
      throw err;
    } finally {
      QmlWeb.$evaluatedObj = prevEvalObj;
      engine.operationState = oldState;
      this.flags = oldFlags;
      this.createFlags = oldCreateFlags;
      this.elementFlags = oldElementFlags;
    }
    return item;
  }

  createObject(parent, properties = {}, outallchanges, outallchanges_old) {
    const item = this.$createObject(parent, properties);

    this.outallchanges = outallchanges;
    this.outallchanges_old = outallchanges_old;
    try {
      if (item instanceof QmlWeb.QtObject) {
        item.$properties.container.set(parent, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged, item);
      } else if (item instanceof QMLComponent) {
        item.$component = this;
      }
    } finally {
      this.outallchanges = undefined;
      this.outallchanges_old = undefined;
    }

    return item;
  }

  toString(name, long) {
    if (this.$name && this.$id && this.$name.toUpperCase()===this.$id.toUpperCase()+".QML") {
      name = this.$id;
    } else if (this.$class && this.$id && this.$class.toUpperCase()===this.$id.toUpperCase()) {
      name = "cl:"+this.$id;
    } else {
      if (!name) name = this.$name;
      if (!name) name = this.$file;
      if (!name&&this.$class) name = "cl:"+this.$class;
      if (name && !long) {
        const l = name.lastIndexOf("/");
        if (l>0) {
          name = "~"+name.substring(l);
        }
      }
      if (this.$id) name += ":"+this.$id;
    }
    var c = QmlWeb.QMLComponentFlags.toString(this.flags);
    if (!name) name = "";

    return c+"["+name+(this.nestedLevel?" l"+this.nestedLevel:"")+(long?" "+QmlWeb.Component.toString(this.status):"")+"]";
  }

  static complete() {

    if (!this.$attachedComponent) {
      throw new QmlWeb.AssertionError("Component complete() invoked but no $attachedComponent :  "+this);
    } else {

      if (this.$component) {
        if (this.$component.status === QmlWeb.Component.Ready) {
          throw new QmlWeb.AssertionError("Component status already Ready in complete() : "+this);
        }
        if (!--this.$component.cntPendingCompletions) {
          // This is the standard status exposed to QML, and its
          // Ready state should not depend on signal/slots (we use
          // engine.operationState/QMLOperationState internally):
          this.$component.status = QmlWeb.Component.Ready;
        }
      }

      try {
        this.$attachedComponent.completed();
        //QmlWeb.log("Completed : "+this+" : "+item);
      } catch (err) {
        if (err.ctType) {
          //QmlWeb.warn("PendingEvaluation : Cannot call Component.completed : parent:"+parent+"  ctx:"+this.context);
        } else {
          throw err;
        }
      }
    }
  }

  static getAttachedObject() {
    if (!this.hasOwnProperty("$attachedComponent")) {
      this.$attachedComponent = new AttachedComponent(this, this.$engine);
    }
    return this.$attachedComponent;
  }

}

class AttachedComponent {
  constructor(parent, engine) {
    try {
      engine.pushengine();
      this.parent = parent;
      this.$engine = engine;
      this.$properties = {};
      this.$engine.initMeta(this, {}, AttachedComponent);
      QObject.attach(parent, this);
    } finally {
      engine.popengine();
    }
  }
  toString() {
    return "AtCmp:"+this.parent;
  }
}

QmlWeb.registerQmlType({
  global: true,
  module: "QtQml",
  name: "Component",
  versions: /.*/,
  constructor: QMLComponent,
  properties: {
    status : "int"
  }
});

QmlWeb.registerQmlType({
  global: true,
  module: "QtQml",
  name: "AttachedComponent",
  versions: /.*/,
  signals: {
    completed: [],
    destruction: []
  },
  constructor: AttachedComponent
});

QmlWeb.QMLComponent = QMLComponent;
QMLComponent.prototype.connectSignal = connectSignal;
AttachedComponent.prototype.connectSignal = connectSignal;
