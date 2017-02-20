let componentIds = 0;

class QMLComponent {
  constructor(meta, flags) {

    this.$componentId = ++componentIds;
    this.$properties = {};
    QmlWeb.initMeta(this, {}, QMLComponent);

    this.copyMeta(meta, flags);

    this.flags = flags;
    this.createFlags = this.flags & (QmlWeb.QMLComponentFlags.Root|QmlWeb.QMLComponentFlags.Nested|QmlWeb.QMLComponentFlags.Super);

    // no component = is import root
    const loaderComponent = QmlWeb.engine.$component;
    this.init(loaderComponent);

  }


  init(loaderComponent) {
    const engine = QmlWeb.engine;

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


    // NOTE making a new level of $context inheritance :
    // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
    // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
    // see also QObject.createChild()->Object.create() in classes.construct
    // see also Object.create in QMLContext.createChild
    if (loaderComponent) {
      if ((this.flags&QmlWeb.QMLComponentFlags.Super?1:0)+(this.flags&QmlWeb.QMLComponentFlags.Nested?1:0) > 1) {
        throw new Error("Assertion failed : component either factory nested or super  It is "+QmlWeb.QMLComponentFlags.toString(this.flags));
      }

      if (this.flags&QmlWeb.QMLComponentFlags.Nested) {
        this.nestedLevel = (loaderComponent.nestedLevel||0)+1;
      }
      if (this.flags&QmlWeb.QMLComponentFlags.Root) {
        throw new Error("Invalid root Component construction (a loader Component is found) : "+this);
      }

      if (this.flags&QmlWeb.QMLComponentFlags.Super) {

        loaderComponent.$base = this;
        this.$leaf = loaderComponent.$leaf;
        this.$root = loaderComponent.$root;

        if (loaderComponent.flags & QmlWeb.QMLComponentFlags.Super) {

          this.loaderComponent = loaderComponent.loaderComponent;
          this.topComponent = loaderComponent.topComponent;

        } else if (loaderComponent.flags & (QmlWeb.QMLComponentFlags.Root|QmlWeb.QMLComponentFlags.Nested)) {

          this.loaderComponent = loaderComponent;
          this.topComponent = this;

        } else {
          throw new Error("Invalid loader Component flags of Super : "+this+"  loader:"+loaderComponent);
        }


        if (this.loaderComponent) {

          if (loaderComponent.flags & QmlWeb.QMLComponentFlags.Nested) {
            if (loaderComponent.$file) {
              throw new Error("Loader Component $file mismatch (should not be set in loader of Nested but) : "+loaderComponent.$file+" vs "+this.$file);
            }
          }
          this.meta.$context = this.context = this.loaderComponent.context.createChild(
                                        this.loaderComponent.toString(undefined, true) +" -> " +this.toString(undefined, true));

          if (this.loaderComponent.flags & QmlWeb.QMLComponentFlags.Super) {
            throw new Error("Asserion failed. Top Component should be Nested or Root. "+this.context)
          }
        } else {

          this.meta.$context = this.context = engine.rootContext.createChild(loaderComponent.toString(undefined, true) + " .. " +this.toString(undefined, true));

        }

        if (!this.$file) {
          throw new Error("No component file");
        }

      } else {
        // Nested or Factory

        this.loaderComponent = loaderComponent;
        this.topComponent = this;
        this.$base = this;
        this.$leaf = this;
        this.$root = loaderComponent.$root;

        this.meta.$context = this.context = loaderComponent.context.createChild(loaderComponent.toString(undefined, true)+" -> "+this.toString(undefined, true), true);
        this.context.nestedLevel = this.nestedLevel;
        // inherit page top $pageElements and $pageContext :
        this.context.$pageElements = loaderComponent.context.$pageElements;
        this.context.$pageContext = loaderComponent.context.$pageContext;
      }

      //QmlWeb.warn("Component  "+this.context);
    } else {
      this.loaderComponent = null;
      this.topComponent = this;
      this.$base = this;
      this.$leaf = this;
      this.$root = this;

      this.meta.$context = this.context = engine.rootContext.createChild(this.toString(undefined, true));

      //QmlWeb.warn("Component  "+this);
      if (this.flags&QmlWeb.QMLComponentFlags.Nested) {
        throw new Error("Component is nested but no loader Component.");
      }
      if (this.flags&QmlWeb.QMLComponentFlags.Super) {
        QmlWeb.warn("Component is super but no loader Component : "+this);
      }
      if (!(this.flags&QmlWeb.QMLComponentFlags.Root)) {
        throw new Error("Component has no loader but Root flag is not set : "+this);
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

    if (this.flags & QmlWeb.QMLComponentFlags.Nested) {

      // Nested item top level uses loader Component imports:
      this.redirectImports(this.loaderComponent);

    } else {

      if (this.moduleConstructors) {
        throw new Error("Assertion failed. Super/Root Component : imports filled.  "+this+"  "+this.context);
      }

      this.initImports();
    }

    if (this.$file) {
      if (!this.$basePathUrl) {
        throw new Error("Assertion failed. No component basePath present.  "+this+"  "+this.context);
      }
    }
    if (!this.moduleConstructors) {
      throw new Error("Assertion failed. Component : no imports.  "+this+"  "+this.context);
    }

    //QmlWeb.log(this.context.toString());

  }

  copyMeta(meta, flags) {
    var cons;
    this.meta = {$component:this};
    if (meta.clazz) {
      if (meta.$file === undefined) {
        meta.$file = meta.clazz.$file;
      } else if (meta.clazz.$file) {
        //  // url -> string
        //  meta.clazz.$file = meta.clazz.$file.toString();

        if (meta.$file !== meta.clazz.$file) {
          if (!meta.clazz.$file.endsWith(meta.$file)) {
            throw new Error("Assertion failed. $file-s in Component and class differ :  meta.$file:'"+meta.$file+"' === meta.clazz.$file:'"+meta.clazz.$file+"'");
          }
        }
      }

      QmlWeb.helpers.copy(this.meta, meta.clazz);
      cons = QmlWeb.constructors[this.meta.$class];
    } else {
      if (meta.$file) {
        throw new Error("QML class or constructor not found : "+meta.$file);
      }

      QmlWeb.helpers.copy(this.meta, meta);
      if (this.meta.$class !== "Component" || this.meta._constructor !== QMLComponent) {
        throw new Error("Assertion failed. Component element $class:"+meta.$class+" !== 'Component' || QMLComponent !== "+(this.meta._constructor?this.meta._constructor.name:"<null>"));
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

      QmlWeb.helpers.copy(this.meta, metachild);
    }

    this.$id = this.meta.id;
    this.$name = this.meta.$name;
    this.$file = this.meta.$file;
    this.$imports = this.meta.$imports;
    if (this.$file) {
      this.$basePathUrl = QmlWeb.resolveBasePath(this.$file);
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

    QmlWeb.preloadImports(this, moduleImports);

    if (this.flags & QmlWeb.QMLComponentFlags.LoadImports) {
      // TODO gz  undefined -> component.$basePathUrl  from createQmlObject
      QmlWeb.loadImports(this, this.$imports);
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

      const uri = QmlWeb.$resolvePath(importDesc[1], this.$basePathUrl);
      const jsBinding = QmlWeb.importJavascript(uri, importDesc[3]);

      if (!jsBinding) {
        QmlWeb.error("Component.loadJsImports: failed to import JavaScript", importDesc[1]);
      }
    }
  }


  $createObject(parent, properties = {}) {
    const engine = QmlWeb.engine;
    const oldFlags = this.flags;
    const oldCreateFlags = this.createFlags;
    // change base path to current component base path
    const oldState = engine.operationState;
    const prevComponent = engine.$component;

    let item;
    try {

      this.status = QmlWeb.Component.Loading;

      // Lazy init :
      if (!this.createFlags) {
        if (parent) {
          this.createFlags = QmlWeb.QMLComponentFlags.Nested;

          // (1) Nested item top level uses loader Component imports  see(2) :
          this.redirectImports(this.loaderComponent);

        } else {
          this.createFlags = QmlWeb.QMLComponentFlags.Root;
          // (2) Clear import redirections if any (may be after (1) ) :
          this.redirectImports(null);
        }
        this.flags |= this.createFlags;
      }

      engine.operationState |= QmlWeb.QMLOperationState.System;
      engine.$component = this;

      // NOTE recursive call to initialize the class then its super  ($createObject -> constuct -> $createObject -> constuct ...) :
      // parent automatically forwards context, see QObject.constructor(parent)
      // no parent -> this.context   see initMeta
      item = QmlWeb.construct(this.meta, parent, QmlWeb.QMLComponentFlags.Element|this.createFlags);
      QmlWeb.helpers.copy(item, properties);

      // !!! see QMLBinding
      // see QObject.constructor()
      this.context.$ownerObject = item;
      item.$pageElements = this.context.$pageElements;
      item.$pageContext = this.context.$pageContext;
      item.$info = this.context.$info;


      this.loadJsImports();

      if (item.isComponentAttached) {
        // NOTE one level of supertype hierarchy, QObject's component first (recursively) :
        // NOTE not possible even trying to emit 'completed' right now, because we are before "applyProperties"
        // and so unable to determine whether a called property exists and not yet initialiazed or it doesn't exist at all.
        const itm = {
          fun:QMLComponent.complete,
          thisObj:this,
          info:"Pending component.complete (waiting to initialization) : "+(this.context?this.context:this)
        };
        QmlWeb.engine.pendingOperations.stack.push(itm);
        QmlWeb.engine.pendingOperations.map["C:"+this.$componentId] = itm;
      } else {
        this.status = QmlWeb.Component.Ready;
      }

    } catch (err) {
      //QmlWeb.warn("Cannot create Object : parent:"+parent+"  ctx:"+this.context+"  "+err.message);
      this.status = QmlWeb.Component.Error;
      throw err;
    } finally {
      engine.$component = prevComponent;
      engine.operationState = oldState;
      this.flags = oldFlags;
      this.createFlags = oldCreateFlags;
    }
    return item;
  }

  createObject(parent, properties = {}) {
    const item = this.$createObject(parent, properties);

    if (item instanceof QmlWeb.ItemBase) {
      item.$properties.parent.set(parent, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged, item);
    } else if (item instanceof QmlWeb.QtObject) {
      item.$properties.container.set(parent, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged, item);
    } else if (item instanceof QMLComponent) {
      item.$component = this;
    }

    return item;
  }

  toString(name, short) {
    if (this.$name && this.$id && this.$name.toUpperCase()===this.$id.toUpperCase()+".QML") {
      name = this.$id;
    } else {
      if (!name) name = this.$name;
      if (!name) name = this.$file;
      if (this.$id) name += ":"+this.$id;
    }
    var c = QmlWeb.QMLComponentFlags.toString(this.flags);

    return c+"["+name+(this.nestedLevel?" l"+this.nestedLevel:"")+(short?"":" "+QmlWeb.Component.toString(this.status))+"]";
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
  constructor: QMLComponent
});

QmlWeb.QMLComponent = QMLComponent;
