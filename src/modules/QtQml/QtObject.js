// Base object for all qml elements

QmlWeb.registerQmlType({
  module: "QtQml",
  name: "QtObject",
  versions: /.*/,
  properties : {
     container: "QtObject",
     $index: { type: "int", bound:true },
     $resourceIndex: { type: "int", bound:true },
     objectName: "string"
  },
  signals: {
     elementAdd: [
       { type: "QtObject", name: "element" }
     ],
     elementRemove: [
       { type: "QtObject", name: "element" }
     ]
  },
}, class QtObject0 extends QmlWeb.QObject {
  constructor(meta) {
    super(meta.parent, meta);
    QmlWeb.initMeta(this, meta, QtObject0);

    // Component get own properties
    this.$attributes = [];
    for (const key in meta.clazz) {
      if (!meta.clazz.hasOwnProperty(key) || !meta.clazz[key]) {
        continue;
      }
      const name = meta.clazz[key].__proto__.constructor.name;
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
    if (oldContainer) oldContainer.elementRemove(this);
    if (newContainer) newContainer.elementAdd(this);
  }
  getAttributes() {
    return this.$attributes;
  }
});
