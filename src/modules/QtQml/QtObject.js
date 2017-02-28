// Base object for all qml elements

class QtObject extends QmlWeb.QObject {
  constructor(meta) {
    super(meta.parent, meta);
    QmlWeb.initMeta(this, meta, QtObject);

    // Component get own properties
    this.$attributes = [];
    for (const key in meta) {
      if (!meta.hasOwnProperty(key) || !meta[key]) {
        continue;
      }
      const name = meta[key].__proto__.constructor.name;
      if (name === "QMLPropertyDefinition" || name === "QMLAliasDefinition") {
        this.$attributes.push(key);
      }
    }

    const Signal = QmlWeb.Signal;

    this.Keys = new QmlWeb.QObject(this, {attached:true, info:"Keys"});
    this.Keys.asteriskPresed = Signal.signal("asteriskPresed");
    this.Keys.backPressed = Signal.signal("backPressed");
    this.Keys.backtabPressed = Signal.signal("backtabPressed");
    this.Keys.callPressed = Signal.signal("callPressed");
    this.Keys.cancelPressed = Signal.signal("cancelPressed");
    this.Keys.deletePressed = Signal.signal("deletePressed");
    for (let i = 0; i < 10; ++i) {
      this.Keys[`digit${i}Pressed`] = Signal.signal(`digit${i}Pressed`);
    }
    this.Keys.escapePressed = Signal.signal("escapePressed");
    this.Keys.flipPressed = Signal.signal("flipPressed");
    this.Keys.hangupPressed = Signal.signal("hangupPressed");
    this.Keys.leftPressed = Signal.signal("leftPressed");
    this.Keys.menuPressed = Signal.signal("menuPressed");
    this.Keys.noPressed = Signal.signal("noPressed");
    this.Keys.pressed = Signal.signal("pressed");
    this.Keys.released = Signal.signal("released");
    this.Keys.returnPressed = Signal.signal("returnPressed");
    this.Keys.rightPressed = Signal.signal("rightPressed");
    this.Keys.selectPressed = Signal.signal("selectPressed");
    this.Keys.spacePressed = Signal.signal("spacePressed");
    this.Keys.tabPressed = Signal.signal("tabPressed");
    this.Keys.upPressed = Signal.signal("upPressed");
    this.Keys.volumeDownPressed = Signal.signal("volumeDownPressed");
    this.Keys.volumeUpPressed = Signal.signal("volumeUpPressed");
    this.Keys.yesPressed = Signal.signal("yesPressed");

    this.containerChanged.connect(this, this.$onContainerChanged_);
  }

  $onContainerChanged_(newContainer, oldContainer, propName) {

    const elemFlag = this.$componentCreateFlags & QmlWeb.QMLComponentFlags.Element;
    if (oldContainer) {
      oldContainer.elementRemove(this, elemFlag);
    }

    if (this.$loaderContext !== newContainer) {
      this.$leaf.cleanupContext(this.$loaderContext);
      if (!this.$isDeleted) {
        this.$leaf.initializeContext(newContainer);
      }
    }

    if (newContainer) {
      newContainer.elementAdd(this, elemFlag);
    }
  }

  getAttributes() {
    return this.$attributes;
  }

  initializeContext(parent, flags, recursiveLoader) {

    if (this.$isAttachedObj || this.hasOwnProperty("$context")) {
      return;
    }

    this.$loaderContext = parent;

    const engine = QmlWeb.engine;
    flags |= this.$componentCreateFlags;

    // Not basic class __proto__ :
    let $pcinfo, $cinfo, loaderComponent;
    if (parent) {
      if (parent.$component) {
        $pcinfo = parent.$component.toString();
      } else {
        $pcinfo = parent.constructor.name;
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
      $cinfo = this.constructor.name;
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
      this.__proto__.initializeContext(parent, QmlWeb.QMLComponentFlags.Super, this);
    }

    // NOTE making a new level of $context inheritance :
    // NOTE gz  context is prototyped from top to bottom, in terms of [containing QML]->[child element] relationship
    // NOTE gz  object is prototyped from bottom to top, in terms of [type]->[supertype] relationship
    // see also QObject.createChild()->Object.create() in classes.construct
    // see also Object.create in QMLContext.createChild

    // #scope hierarchy:
    // see also component.js/QMLContext.createChild

    if (parent) {
      if ((flags&QmlWeb.QMLComponentFlags.Super?1:0)+(flags&QmlWeb.QMLComponentFlags.Nested?1:0) > 1) {
        throw new QmlWeb.AssertionError("Assertion failed : component either factory, nested or super  It is "+QmlWeb.QMLComponentFlags.toString(flags));
      }

      if (flags&QmlWeb.QMLComponentFlags.Root) {
        throw new Error("Invalid root Component construction (a loader Component is found) : "+this.toString.apply(this));
      }

      if (flags&QmlWeb.QMLComponentFlags.Super) {

        if (parent) {

          this.$context = parent.$context.createChild($pcinfo +" ~> " +$cinfo, flags);

        } else {

          this.$context = engine._rootContext.createChild($pcinfo + " .. " +$cinfo, flags);

        }

      } else {
        // Nested or Factory

        this.$context.nestedLevel = this.nestedLevel = (parent.nestedLevel||0)+1;

        this.$context = parent.$context.createChild($pcinfo+" -> "+$cinfo, flags);
      }

      //QmlWeb.warn("Component  "+this.$context);
    } else {

      this.$context = engine._rootContext.createChild($cinfo);

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
    this.$info = this.$context.$info;

    if (this.$component) {
      this.$component.loadJsImports();
    }
  }

  cleanupContext(parent) {
    // TODO gz
    // mabe additional cleanup tasks for each QMLContext object

    if (!this.$isAttachedObj) {
      delete this.$context;
      if (this.$base !== this) {
        this.__proto__.cleanupContext(parent);
      }
    }
  }

};

QmlWeb.registerQmlType({
  module: "QtQml",
  name: "QtObject",
  versions: /.*/,
  properties : {
     // null to remove "Uninitialized" state because of  elementRemove / elementAdd
     container: { type: "QtObject", initialValue: null },
     $index: { type: "int", pendingInit:true, readOnly:true },
     $resourceIndex: { type: "int", pendingInit:true, readOnly:true },
     objectName: "string"
  },
  signals: {
     elementAdd: [
       { type: "QtObject", name: "element" },
       { type: "int", name: "flags" }
     ],
     elementRemove: [
       { type: "QtObject", name: "element" },
       { type: "int", name: "flags" }
     ]
  },
  constructor: QtObject
});

QmlWeb.QtObject = QtObject;
