QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "CheckBox",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
    text: "string",
    checked: "bool",
    color: "color"
  }
}, class CheckBox extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

    this.impl = document.createElement("label");
    this.impl.className = "qmllabel"

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "qmlcheckbox";
    checkbox.addEventListener("change", () => {
      this.checked = checkbox.checked;
    });
    this.impl.appendChild(checkbox);

    const span = document.createElement("span");
    this.impl.appendChild(span);

    this.dom.appendChild(this.impl);

    const QMLFont = QmlWeb.getConstructor("QtQuick", "2.0", "Font");
    this.font = new QMLFont(this);

    this.Component.completed.connect(this, this.Component$onCompleted);
    this.textChanged.connect(this, this.$onTextChanged);
    this.colorChanged.connect(this, this.$onColorChanged);
    this.checkedChanged.connect(this, this.$onCheckedChanged);
  }
  $onTextChanged(newVal) {
    this.impl.children[1].innerHTML = newVal;
    this.implicitHeight = this.impl.offsetHeight;
    this.implicitWidth = this.impl.offsetWidth > 0 ?
                          this.impl.offsetWidth + 4 :
                          0;
  }
  $onColorChanged(newVal) {
    this.impl.children[1].style.color = new QmlWeb.QColor(newVal);
  }
  $onCheckedChanged() {
    this.impl.children[0].checked = this.checked;
  }
  Component$onCompleted() {
    this.implicitHeight = this.impl.offsetHeight;
    this.implicitWidth = this.impl.offsetWidth > 0 ?
                          this.impl.offsetWidth + 4 :
                          0;
  }
});
