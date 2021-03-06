class Button extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Button);

    this.Component.completed.connect(this, this.Component$onCompleted);
    this.textChanged.connect(this, this.$onTextChanged);
    this.enabledChanged.connect(this, this.$onEnabledChanged);

    const button = this.impl = document.createElement("button");
    button.className = "qmlbutton"
    this.dom.appendChild(button);

    button.onclick = () => {
      this.clicked();
    };
    setTimeout(this.Component$onCompleted.bind(this), 0);
  }
  Component$onCompleted() {
    this.implicitWidth = this.impl.offsetWidth;
    this.implicitHeight = this.impl.offsetHeight;
  }
  $onTextChanged(newVal) {
    this.impl.textContent = newVal;
    //TODO: Replace those statically sized borders
    this.implicitWidth = this.impl.offsetWidth;
    this.implicitHeight = this.impl.offsetHeight;
  }
  $onEnabledChanged(newVal) {
    this.impl.disabled = !newVal;
  }

}

QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "Button",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
    text: "string",
    enabled: { type: "bool", initialValue: true }
  },
  signals: {
    clicked: []
  },
  constructor:Button
});
