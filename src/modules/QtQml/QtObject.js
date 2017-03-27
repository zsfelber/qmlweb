// Base object for all qml elements

class QtObject extends QmlWeb.QObject {
  constructor(meta) {
    super(meta.parent, meta);
    this.$engine.initMeta(this, meta, QtObject);

    // Component get own properties
    this.$attributes = [];
    if (meta.parentmeta) {
      for (const key in meta.parentmeta) {
        if (!meta.parentmeta.hasOwnProperty(key) || !meta.parentmeta[key]) {
          continue;
        }
        const name = meta.parentmeta[key].__proto__.constructor.name;
        if (name === "QMLPropertyDefinition" || name === "QMLAliasDefinition") {
          this.$attributes.push(key);
        }
      }
    }

    this.containerChanged.connect(this, this.$onContainerChanged_);
  }

  $onContainerChanged_(newContainer, oldContainer, propName) {

    const leaf = this.$leaf;
    const elemFlag = leaf.$componentCreateFlags & QmlWeb.QMLComponentFlags.Element;

    if (oldContainer) {
      oldContainer.$elementRemove(leaf, elemFlag, leaf.$component?leaf.$component.outallchanges_old:undefined);
    }

    if (leaf.$loaderContext !== (newContainer?newContainer.$context:undefined)) {
      leaf.cleanupContext(leaf.$loaderContext);
      if (!leaf.$isDeleted) {
        leaf.initializeContext(newContainer);
      }
    }

    if (newContainer) {
      newContainer.$elementAdd(leaf, elemFlag, leaf.$component?leaf.$component.outallchanges:undefined);
    }
  }

  $elementAdd(element, flags, outallchanges) {
    const elemFlag = flags & QmlWeb.QMLComponentFlags.Element;

    if (elemFlag) {
      if (this.$defaultProperty) {
        var prop = this.$properties[this.$defaultProperty];
        if (prop.type === "list") {
          var parr = prop.value;
          element.$properties.$index.set(parr.length, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
          parr.push(element);
          if (outallchanges) {
            outallchanges[this.$defaultProperty] = (outallchanges[this.$defaultProperty] || 0) + 1;
          } else {
            prop.changed(parr, parr, this.$defaultProperty);
          }
        } else {
          element.$properties.$index.set(0, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
          if (element === prop.value) {
            // notifying always :
            prop.changed(element, element, this.$defaultProperty);
          } else {
            prop.set(element);
          }
        }
      } else {
        throw new Error("QtObject.$elementAdd : No default property : "+this+"/"+this.$leaf);
      }
    }
  }

  $elementRemove(element, flags, outallchanges) {
    const elemFlag = flags & QmlWeb.QMLComponentFlags.Element;

    if (elemFlag) {
      if (this.$defaultProperty) {
        var prop = this.$properties[this.$defaultProperty];
        if (prop.type === "list") {
          var parr = prop.get();
          parr.splice(element.$index, 1);
          for (var i = element.$index; i < parr.length; ++i) {
            const p = parr[i].$properties;
            if (p) {
              p.$index.set(i, QmlWeb.QMLPropertyFlags.ReasonInitPrivileged);
              if (outallchanges) {
                outallchanges[this.$defaultProperty] = (outallchanges[this.$defaultProperty] || 0) + 1;
              } else {
                prop.changed(parr, parr, this.$defaultProperty);
              }
            } else {
              console.warn(this+" . $elementRemove : default property : "+this.$defaultProperty+", no array["+i+"].$properties : "+parr);
            }
          }
        } else {
          prop.set(null);
        }
      } else {
        throw new Error("QtObject.$elementRemove : No default property : "+this+"/"+this.$leaf);
      }
    }
  }

  getAttributes() {
    return this.$attributes;
  }

  initializeContext(parent, flags, recursiveLoader, req=0) {

    if (this.$isAttachedObj || this.hasOwnProperty("$context")) {
      return;
    }

    this.$loaderContext = parent?parent.$context:undefined;

    const engine = this.$engine;

    flags |= this.$componentCreateFlags;

    // Not basic class __proto__ :
    let $pcinfo, $cinfo, loaderComponent;
    if (parent) {
      if (parent.$component) {
        $pcinfo = parent.$component.toString();
      } else {
        $pcinfo = "("+parent.constructor.name+")";
      }
    } else {
      $pcinfo = "";
    }

    if (this.$component) {
      let nm = this.$component.$name;
      if (/\.qml$/.test(nm)) {
        nm = nm.substring(0, nm.length-4);
      }

      this.$superclass = this.$class;
      this.$class = nm;
      if (flags & QmlWeb.QMLComponentFlags.Nested) {
        this.$classname = "["+nm+"]";
      } else {
        this.$classname = nm;
      }
      $cinfo = this.$component.toString();
      loaderComponent = this.$component.loaderComponent;
    } else {
      $cinfo = "("+this.constructor.name+(req?":"+req:"")+")";
    }

    if (!recursiveLoader) {
      if (this.$base !== this) {
        if (!this.$component) {
          throw new QmlWeb.AssertionError("Assertion failed. No component : "+this.toString.apply(this));
        }
      }

      if (!loaderComponent===!(this.$component.flags & QmlWeb.QMLComponentFlags.Root)) {
        throw new QmlWeb.AssertionError("Assertion failed.   Loader:"+loaderComponent+"  invalid flags : "+QmlWeb.QMLComponentFlags.toString(flags));
      }
    }


    if (this.$context) {
      if (recursiveLoader) {
        throw new QmlWeb.AssertionError("Invalid call. recursive+context : "+this.toString.apply(this)+"  context:"+this.$context);
      }
    } else if (this.$base !== this) {
      // when component added dynamically, we initialize the whole prototype chain's contexts :
      this.__proto__.initializeContext(parent, QmlWeb.QMLComponentFlags.Super, this, req+1);
    }

    // NOTE making a new level of $context inheritance :
    // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
    // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
    // see also QObject.createChild()->Object.create() in classes.construct
    // see also Object.create in QMLContext.createChild

    // #scope hierarchy:
    // see also component.js/QMLContext.createChild

    let info;
    if (parent) {
      if ((flags&QmlWeb.QMLComponentFlags.Super?1:0)+(flags&QmlWeb.QMLComponentFlags.Nested?1:0) > 1) {
        throw new QmlWeb.AssertionError("Assertion failed : component either factory, nested or super  It is "+QmlWeb.QMLComponentFlags.toString(flags));
      }

      if (flags&QmlWeb.QMLComponentFlags.Root) {
        throw new Error("Invalid root Component construction (a loader Component is found) : "+this.toString.apply(this));
      }

      if (flags&QmlWeb.QMLComponentFlags.Super) {

        this.$context = parent.$context.createChild(info = $pcinfo +" ~> " +$cinfo, flags);

      } else {
        // Nested or Factory

        this.$context.nestedLevel = this.nestedLevel = (parent.nestedLevel||0)+1;

        this.$context = parent.$context.createChild(info = $pcinfo+" -> "+$cinfo, flags);
      }

      //QmlWeb.warn("Component  "+this.$context);
    } else {

      this.$context = engine._rootContext.createChild(info = $cinfo);

      //QmlWeb.warn("Component  "+this);
      if (flags&QmlWeb.QMLComponentFlags.Nested) {
        throw new Error("Component is nested but no loader Component.");
      }
    }

    this.$context.$component = this.$component;

    // !!! see QMLBinding
    this.$context.$ownerObject = this;
    this.$pageElements = this.$context.$pageElements;
    this.$pageContext = this.$context.$pageContext;
    this.$info = info;

    if (this.$component) {
      this.$component.loadJsImports();
    }

    // We can't finish context initialization
    // until the current construct/constructSuper/component.createObject recursion calling thread
    // returns to the the first non-super component, see also classes.construct, components.js/splitExternalContext
    if (flags & QmlWeb.QMLComponentFlags.Super && this.__proto__.$context) {
      this.__proto__.$context.splitExternalContext();
    }

    QmlWeb.applyAllAttachedObjects(this);

    // each element into all parent context's elements on the page, by id :
    // There is no ctx for internal modules (not created by Component but its constructor) : then no need to register..
    // (see properties.createProperty. )
    if (this.id) {
      engine.addElementToPageContexts(this, this.id, this.$context);
    //} else if (flags & QmlWeb.QMLComponentFlags.Nested) {
    //  QmlWeb.warn("No element id for this  : "+this+"  ctx:"+ctx);
    }

    if (this.hasOwnProperty("$meta2")) {
      // Apply properties according to this metatype info
      // (In case it is dynamic load or before engine started, Bindings won't get evaluated, yet)
      engine.applyProperties(this.$meta2, this);
    }
  }

  cleanupContext(parent) {
    // TODO gz
    // mabe additional cleanup tasks for each QMLContext object

    if (!this.$isAttachedObj) {
      delete this.$context;
      delete this.$loaderContext;
      if (this.$base !== this) {
        this.__proto__.cleanupContext(parent);
      }
    }
  }

};

class QtKeys {
  constructor(parent, engine) {
    try {
      engine.pushengine();

      this.parent = parent;
      this.$engine = engine;
      this.$properties = {};
      this.$engine.initMeta(this, {}, QtKeys);

      QObject.attach(parent, this);
    } finally {
      engine.popengine();
    }
  }

  static getAttachedObject() {
    if (!this.hasOwnProperty("$Keys")) {
      this.$Keys = new QtKeys(this, this.$engine);
    }
    return this.$Keys;
  }

  toString() {
    return "Keys:"+this.parent;
  }
}

QmlWeb.registerQmlType({
  module: "QtQml",
  name: "QtObject",
  versions: /.*/,
  properties : {
     // null to remove "Uninitialized" state because of  elementRemove / elementAdd
     container: { type: "QtObject", initialValue: null },
     $index: { type: "int", readOnly:true },
     $resourceIndex: { type: "int", readOnly:true },
     objectName: "string"
  },
  constructor: QtObject
});

QmlWeb.registerQmlType({
  global: true,
  module: "QtQml",
  name: "Keys",
  versions: /.*/,
  owners: /QtQml\.QtObject/,
  signals: {
    asteriskPresed : [], backPressed : [], backtabPressed : [], callPressed : [],
    cancelPressed : [], deletePressed : [], digit0Pressed : [], digit1Pressed : [],
    digit2Pressed : [], digit3Pressed : [], digit4Pressed : [], digit5Pressed : [],
    digit6Pressed : [], digit7Pressed : [], digit8Pressed : [], digit9Pressed : [],
    escapePressed : [], flipPressed : [], hangupPressed : [], leftPressed : [],
    menuPressed : [], noPressed : [], pressed : [], released : [], returnPressed : [],
    rightPressed : [], selectPressed : [], spacePressed : [], tabPressed : [],
    upPressed : [], volumeDownPressed : [], volumeUpPressed : [], yesPressed : [],
  },
  properties: {
  },
  constructor: QtKeys
});

QmlWeb.QtObject = QtObject;
