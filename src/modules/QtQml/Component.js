class QMLComponent {
  constructor(meta, flags) {

    this.$properties = {};
    QmlWeb.initMeta(this, {}, QMLComponent);

    this.copyMeta(meta, flags);

    this.flags = flags;
    this.createFlags = this.flags & (QMLComponent.Root|QMLComponent.Nested|QMLComponent.Super);

    // init now, otherwise it's Lazy
    if (this.createFlags) {
      // no component = is import root
      const loaderComponent = QmlWeb.engine.$component;
      this.init(loaderComponent);
    }

  }


  init(loaderComponent) {
    const engine = QmlWeb.engine;

    if ( this.flags & QmlWeb.QMLComponent.Nested ) {

      // NOTE on the top of a Nested Component's loader hierarchy, we have to insert 1 extra level of Components into
      // chains, changing $class from the "superclass" to the current again (but with Super Component flag):
      // No infinite loop, because component.flags is not Nested the next time  :

      if (this.meta.$name && this.meta.$name !== this.meta.$class+".qml") {
        throw new Error("Nested Component meta should not define a superclass other than (meta.$name : "+this.meta.$name+")  super: meta.$class:"+this.meta.$class);
      }
      this.$name = this.meta.$name = this.meta.$class + ".qml";

      //var cl = /(^.*?)\.qml/.exec(this.meta.$name)[1];
      //var cl = this.meta.$class;
      //console.log("Nested Element top Component inserted  $class =  superclass:"+this.meta.$class+" -> actual:"+cl);
      //this.$class = this.meta.$class = cl;
    }


    // NOTE making a new level of $context inheritance :
    // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
    // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
    // see also QObject.createChild()->Object.create() in classes.construct
    // see also Object.create in QMLContext.createChild
    if (loaderComponent) {
      if (!(this.flags&QMLComponent.Super)===!(this.flags&QMLComponent.Nested))
        throw new Error("Assertion failed : either meta.nested or meta.super  It is "+((this.flags&QMLComponent.Super)?"both":"neither")+" "+this);

      if (this.flags&QMLComponent.Nested) {
        this.nestedLevel = (loaderComponent.nestedLevel||0)+1;
      }
      if (this.flags&QMLComponent.Root) {
        throw new Error("Invalid root Component construction (a loader Component is found) : "+this);
      }

      if (this.flags&QMLComponent.Super) {

        loaderComponent.$base = this;
        this.$leaf = loaderComponent.$leaf;
        this.$root = loaderComponent.$root;

        if (loaderComponent.flags & QMLComponent.Super) {

          this.loaderComponent = loaderComponent.loaderComponent;
          this.topComponent = loaderComponent.topComponent;

        } else if (loaderComponent.flags & (QMLComponent.Root|QMLComponent.Nested)) {

          this.loaderComponent = loaderComponent;
          this.topComponent = this;

        } else {
          throw new Error("Invalid loader Component flags of Super : "+this+"  loader:"+loaderComponent);
        }


        if (this.loaderComponent) {

          if (loaderComponent.flags & QMLComponent.Nested) {
            if (loaderComponent.$file) {
              throw new Error("Loader Component $file mismatch (should not be set in loader of Nested but) : "+loaderComponent.$file+" vs "+this.$file);
            }
          }
          this.meta.context = this.context = this.loaderComponent.context.createChild(
                                        this.loaderComponent +" -> " +this);

          if (this.loaderComponent.flags & QMLComponent.Super) {
            throw new Error("Asserion failed. Top Component should be Nested or Root. "+this.context)
          }
        } else {

          this.meta.context = this.context = engine.rootContext.createChild(loaderComponent + " .. " +this);

        }

        if (!this.$file) {
          throw new Error("No component file");
        }

      } else {
        this.loaderComponent = loaderComponent;
        this.topComponent = this;
        this.$base = this;
        this.$leaf = this;
        this.$root = loaderComponent.$root;

        this.meta.context = this.context = loaderComponent.context.createChild(loaderComponent+" -> "+this, true);
        this.context.nestedLevel = this.nestedLevel;

      }

      //console.warn("Component  "+this.context);
    } else {
      this.loaderComponent = null;
      this.topComponent = this;
      this.$base = this;
      this.$leaf = this;
      this.$root = this;

      this.meta.context = this.context = engine.rootContext.createChild(this.toString());

      //console.warn("Component  "+this);
      if (this.flags&QMLComponent.Nested) {
        throw new Error("Component is nested but no loader Component.");
      }
      if (this.flags&QMLComponent.Super) {
        console.warn("Component is super but no loader Component : "+this);
      }
      if (!(this.flags&QMLComponent.Root)) {
        throw new Error("Component has no loader but Root flag is not set : "+this);
      }
      if (!this.$file) {
        throw new Error("No component file");
      }
    }

    this.context.component = this;
    this.context.loaderContext = this.loaderComponent ? this.loaderComponent.context : engine.rootContext;
    this.context.topContext = this.topComponent ? this.topComponent.context : null;

    // !!! see QMLBinding
    this.$context = this.context;
    this.$component = this;

    if (!this.context) {
      throw new Error("No component context");
    }

    if (this.flags & QMLComponent.Nested) {

      // Nested item top level uses loader Component imports:
      this.bindImports(loaderComponent);

    } else {

      if (this.moduleConstructors) {
        throw new Error("Assertion failed. Super/Root Component : imports filled.  "+this+"  "+this.context);
      }

      this.initImports();
    }

    if (!this.$basePath) {
      throw new Error("Assertion failed. No component basePath present.  "+this+"  "+this.context);
    }
    if (!this.moduleConstructors) {
      throw new Error("Assertion failed. Component : no imports.  "+this+"  "+this.context);
    }

    //console.log(this.context.toString());

  }

  copyMeta(meta) {
    var cons;
    this.meta = {component:this};
    if (meta.clazz) {
      if (meta.$file === undefined) {
          meta.$file = meta.clazz.$file;
      }
      if (meta.$file !== meta.clazz.$file) {
        throw new Error("Assertion failed. $file-s in Component and class differ :  meta.$file:"+meta.$file+" === meta.clazz.$file:"+meta.clazz.$file);
      }

      QmlWeb.helpers.copy(this.meta, meta.clazz);
      cons = QmlWeb.constructors[this.meta.$class];
    } else {
      QmlWeb.helpers.copy(this.meta, meta);
      if (this.meta.$class !== "Component" || this.meta._constructor !== QMLComponent) {
        throw new Error("Assertion failed. Component element $class:"+meta.$class+" !== 'Component' || QMLComponent !== "+(this.meta._constructor?this.meta._constructor.name:"<null>"));
      }
      cons = this.meta._constructor;
    }

    if (cons === QMLComponent) {
      var metaObject = this.meta.$children;
      if (metaObject instanceof Array) {
        if (metaObject.length !== 1) {
          throw new Errror("Component should define 1 element : "+this.meta.$name+"("+this.meta.$class+") "+this.meta.id);
        }
        QmlWeb.helpers.copy(this.meta, metaObject[0]);
      }
    }

    this.$id = this.meta.$id;
    this.$name = this.meta.$name;
    this.$file = this.meta.$file;
    this.$imports = this.meta.$imports;
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
        _add_imp(this.$imports[i]);
      }
    }

    QmlWeb.preloadImports(this, moduleImports);

    if (this.flags & QMLComponent.LoadImports) {
      // TODO gz  undefined -> component.$basePath  from createQmlObject
      QmlWeb.loadImports(this, this.$imports);
    }
  }

  bindImports(sourceComponent) {
    //console.warn("bindImports : binding imports...  "+this+"  ==> "+sourceComponent);
    if (this.boundImportComponent) {
      console.warn("bindImports : rebind imports from   "+this+"  ==> "+sourceComponent + "   (2nd) ~~~ to ~~>   " +this.boundImportComponent);
    }
    if (this.boundImportComponent === sourceComponent) {
      return ;
    }

    if (this.$jsImports&&this.$jsImports.length ||
        this.moduleConstructors&&Object.keys(this.moduleConstructors).length ||
        this.ctxQmldirs&&Object.keys(this.ctxQmldirs).length ||
        this.componentImportPaths&&Object.keys(this.componentImportPaths).length  ) {
      console.warn("bindImports : imports already loaded, of : "+this+", now rebinding imports to another Component");
    }

    this.boundImportComponent = sourceComponent;

    if (sourceComponent) {
      if (!this.$basePath0) {
        // Save
        this.$jsImports0 = this.$jsImports;
        this.moduleConstructors0 = this.moduleConstructors;
        this.ctxQmldirs0 = this.ctxQmldirs; // resulting components lookup table
        this.componentImportPaths0 = this.componentImportPaths;
        this.$basePath0 = sourceComponent.$basePath;
      }
      this.$jsImports = Object.create(sourceComponent.$jsImports);
      this.moduleConstructors = Object.create(sourceComponent.moduleConstructors);
      this.ctxQmldirs = Object.create(sourceComponent.ctxQmldirs); // resulting components lookup table
      this.componentImportPaths = Object.create(sourceComponent.componentImportPaths);
      this.$basePath = sourceComponent.$basePath;
    } else {
      // Restore
      this.$jsImports = this.$jsImports0;
      this.moduleConstructors = this.moduleConstructors0;
      this.ctxQmldirs = this.ctxQmldirs0; // resulting components lookup table
      this.componentImportPaths = this.componentImportPaths0;
      this.$basePath = sourceComponent.$basePath0;
    }
  }


  $createObject(parent, properties = {}) {
    const engine = QmlWeb.engine;
    const oldCreateFlags = this.createFlags;
    // change base path to current component base path
    const oldState = engine.operationState;
    const prevComponent = engine.$component;

    let item;
    try {

      this.status = QmlWeb.Component.Loading;

      // Lazy init :
      if (!this.createFlags) {
        let loaderComponent;
        if (parent) {
          this.createFlags = QMLComponent.Nested;
          loaderComponent = parent.$component;
        } else {
          this.createFlags = QMLComponent.Root;
        }
        this.flags |= this.createFlags;
        this.init(loaderComponent);
      }

      engine.operationState |= QmlWeb.QMLOperationState.System;
      engine.$component = this;

      // NOTE recursive call to initialize the class then its super  ($createObject -> constuct -> $createObject -> constuct ...) :
      // parent automatically forwards context, see QObject.constructor(parent)
      // no parent -> this.context   see initMeta
      item = QmlWeb.construct(this.meta, parent, QMLComponent.Element|this.createFlags);
      QmlWeb.helpers.copy(item, properties);

      // !!! see QMLBinding
      this.context.$ownerObject = item;

      item.$elements = this.context.$elements;
      item.$info = this.context.$info;

      this.finalizeImports();

      if (item.isComponentAttached) {
        // NOTE one level of supertype hierarchy, QObject's component first (recursively) :
        // NOTE not possible even trying to emit 'completed' right now, because we are before "applyProperties"
        // and so unable to determine whether a called property exists and not yet initialiazed or it doesn't exist at all.
        QmlWeb.engine.pendingOperations.push({
          fun:QMLComponent.complete,
          thisObj:this,
          info:"Pending component.complete (waiting to initialization) : "+(this.context?this.context:this)
        });
      } else {
        this.status = QmlWeb.Component.Ready;
      }

    } catch (err) {
      //console.warn("Cannot create Object : parent:"+parent+"  ctx:"+this.context+"  "+err.message);
      this.status = QmlWeb.Component.Error;
      throw err;
    } finally {
      engine.$component = prevComponent;
      engine.operationState = oldState;
      this.createFlags = oldCreateFlags;
    }
    return item;
  }

  createObject(parent, properties = {}) {
    const item = this.$createObject(parent, properties);

    if (item instanceof QmlWeb.ItemBase) {
      item.$properties.parent.set(parent, QmlWeb.QMLProperty.ReasonInitPrivileged);
    } else if (item instanceof QmlWeb.QtObject) {
      item.$properties.container.set(parent, QmlWeb.QMLProperty.ReasonInitPrivileged);
    } else if (item instanceof QMLComponent) {
      item.$component = this;
    }

    return item;
  }

  toString(name) {
    if (!name) name = this.$file;
    if (!name) name = this.$name;
    if (this.$id) name += ":"+this.$id;
    var c = "";
    var f = "";
    var fn = this.flags;
    for (;;) {
      if (fn>=QMLComponent.LoadImports) { f+="i";    fn-=QMLComponent.LoadImports; }
      else if (fn>=QMLComponent.Element) { f+="e";    fn-=QMLComponent.Element; }
      else if (fn>=QMLComponent.Root) { c+="R";  fn-=QMLComponent.Root; }
      else if (fn>=QMLComponent.Nested) { c+="N";fn-=QMLComponent.Nested; }
      else if (fn>=QMLComponent.Super) { c+="S"; fn-=QMLComponent.Super; }
      else break;
    }

    return c+"["+name+(this.flags?" "+f:"")+(this.nestedLevel?" l"+this.nestedLevel:"")+"]";
  }

  static complete() {

    if (this.status === QmlWeb.Component.Ready) {
      throw new Error("Component status already Ready in complete()  "+this);
    } else {
      // This is the standard status exposed to QML, and its
      // Ready state should not depend on signal/slots (we use
      // engine.operationState/QMLOperationState internally):
      this.status = QmlWeb.Component.Ready;

      try {
        this.completed();
        //console.log("Completed : "+this+" : "+item);
      } catch (err) {
        if (err.ctType === "PendingEvaluation") {
          //console.warn("PendingEvaluation : Cannot call Component.completed : parent:"+parent+"  ctx:"+this.context);
        } else {
          throw err;
        }
      }
    }
  }

  static getAttachedObject() {
    if (!this.isComponentAttached) {
      this.isComponentAttached = true;
    }
    return this.$component;
  }

}

QmlWeb.registerQmlType({
  global: true,
  module: "QtQml",
  name: "Component",
  versions: /.*/,
  signals: {
    completed: [],
    destruction: []
  },
  properties: {
    status: { type:"enum", initialValue: QmlWeb.Component.Null}
  },
  constructor: QMLComponent
});

// determine automatically whether Nested or Root (Super is not possible)
// at every ($)createObject
QMLComponent.LazyOrFactory = 0;

QMLComponent.Super = 1;
QMLComponent.Nested = 2;
QMLComponent.Root = 4;
QMLComponent.Element = 8;
QMLComponent.LoadImports = 16;
QmlWeb.QMLComponent = QMLComponent;
