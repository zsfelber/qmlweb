QmlWeb.registerQmlType({
  module: "QtQuick.Controls",
  name: "ComboBox",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
    count: "int",
    currentIndex: "int",
    currentText: "string",
    textRole: "string",
    indexRole: "string",
    menu: { type: "array", initialValue: [] },
    model: { type: "array", initialValue: [] },
    pressed: "bool",
    popupVisible: "bool",
    editable: "bool"
  },
  signals: {
    accepted: [],
    activated: [{ type: "int", name: "index" }]
  }
}, class ComboBox extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, ComboBox);

    QmlWeb.setStyle(this.css, "pointerEvents", "auto");
    this.name = "QMLComboBox";

    this.Component.completed.connect(this, this.Component$onCompleted);
    this.modelChanged.connect(this, this.$onModelChanged);

    this.dom.onclick = () => {
      const index = this.dom.firstChild.selectedIndex;
      this.currentIndex = index;
      this.currentText = this.model[index];
      this.accepted();
      this.activated(index);
    };
    this.popupVisibleChanged.connect(this, function() {
      if (this.dom && this.popupVisible) {
        this.dom.focus();
      }
    });
  }
  find(text) {
    if (this.model.find)
      return this.model.find(text);
    var textRole = this.textRole;
    return this.model.find(function(){
      if (textRole)
        return this[textRole] === text;
      else
        return this === text;
    });
  }
  selectAll() {
    // TODO
  }
  textAt(index) {
    var v = this.model[index];
    if (this.textRole)
      v = v[this.textRole];
    return v;
  }

  $updateImpl() {
    this.currentIndex = 0;
    this.count = this.model.length;
    const entries = [];
    for (let i = 0; i < this.count; i++) {
      const elt = this.model[i];
      //if (elt instanceof Array) { // TODO - optgroups? update model !
      //    var count_i = elt.length;
      //    for (var j = 0; j < count_i; j++)
      //        html += "<option>" + elt[j] + "</option>";
      //}
      //else
      if (textRole)
        entries.push(`<option>${elt[textRole]}</option>`);
      else
        entries.push(`<option>${elt}</option>`);
    }
    // TODO: remove innerHTML, port to DOM
    this.dom.innerHTML = `<select>${entries.join("")}</select>`;
    this.impl = this.dom.firstChild;
  }
  Component$onCompleted() {
    this.$updateImpl();
    this.implicitWidth = this.impl.offsetWidth;
    this.implicitHeight = this.impl.offsetHeight;
  }
  $onModelChanged() {
    this.$updateImpl();
  }
});
