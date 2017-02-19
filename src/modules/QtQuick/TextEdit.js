var defaultTextareaStyle = {
  pointerEvents  : "auto",
  width  : "100%",
  height  : "100%",
  boxSizing  : "border-box",
  borderWidth  : "0px",
  background  : "none",
  outline  : "none",
  resize  : "none",
  padding  : "0px",
  margin  : "0px"
};

class TextEdit extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta, TextEdit);

    const QMLFont = QmlWeb.getConstructor("QtQuick", "2.0", "Font");
    this.font = new QMLFont(this);

    // Undo / Redo stacks;
    this.undoStack = [];
    this.undoStackPosition = -1;
    this.redoStack = [];
    this.redoStackPosition = -1;

    const textarea = this.impl = document.createElement("textarea");
    this.impl.className = "qmltextarea";
    this.tacss = QmlWeb.createStyle(textarea.style);

    textarea.disabled = false;
    this.dom.appendChild(textarea);

    this.Component.completed.connect(this, this.Component$onCompleted);
    this.textChanged.connect(this, this.$onTextChanged);
    this.colorChanged.connect(this, this.$onColorChanged);

    this.impl.addEventListener("input", () => this.$updateValue());
  }
  append(text) {
    this.text += text;
  }
  copy() {
    // TODO
  }
  cut() {
    this.text = this.text(0, this.selectionStart) +
                this.text(this.selectionEnd, this.text.length);
    // TODO
  }
  deselect() {
    //this.selectionStart = -1;
    //this.selectionEnd = -1;
    //this.selectedText = null;
    // TODO
  }
  getFormattedText(start, end) {
    const text = this.text.slice(start, end);
    // TODO
    // process text
    return text;
  }
  getText(start, end) {
    return this.text.slice(start, end);
  }
  insert(/*position, text*/) {
    // TODO
  }
  isRightToLeft(/*start, end*/) {
    // TODO
  }
  linkAt(/*x, y*/) {
    // TODO
  }
  moveCursorSelection(/*x, y*/) {
    // TODO
  }
  paste() {
    // TODO
  }
  positionAt(/*x, y*/) {
    // TODO
  }
  positionToRectangle(/*position*/) {
    // TODO
  }
  redo() {
    // TODO
  }
  remove(/*start, end*/) {
    // TODO
  }
  select(/*start, end*/) {
    // TODO
  }
  selectAll() {
    // TODO
  }
  selectWord() {
    // TODO
  }
  undo() {
    // TODO
  }
  Component$onCompleted() {
    this.selectByKeyboard = !this.readOnly;
    this.$updateValue();
    this.implicitWidth = this.offsetWidth;
    this.implicitHeight = this.offsetHeight;
  }
  $onTextChanged(newVal) {
    this.impl.value = newVal;
  }
  $onColorChanged(newVal) {
    QmlWeb.setStyle(this.tacss, "color", newVal, defaultTextareaStyle);
  }
  $updateValue() {
    if (this.text !== this.impl.value) {
      this.text = this.impl.value;
    }
    this.length = this.text.length;
    this.lineCount = this.$getLineCount();
    this.$updateCss();
  }
  // Transfer dom style to firstChild,
  // then clear corresponding dom style
  $updateCss() {
    const supported = [
      "border",
      "borderRadius",
      "borderWidth",
      "borderColor",
      "backgroundColor",
    ];
    const style = this.tacss;
    for (let n = 0; n < supported.length; n++) {
      const o = supported[n];
      const v = this.css[o];
      if (v) {
        QmlWeb.setStyle(this.tacss, o, v, defaultTextareaStyle);
        QmlWeb.setStyle(this.css, o, null, defaultTextareaStyle);
      }
    }
  }
  $getLineCount() {
    return this.text.split(/\n/).length;
  }
}


QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "TextEdit",
  versions: /.*/,
  baseClass: "Item",
  properties: {
    activeFocusOnPress: { type: "bool", initialValue: true },
    baseUrl: "url",
    canPaste: "bool",
    canRedo: "bool",
    canUndo: "bool",
    color: { type: "color", initialValue: "white" },
    contentHeight: "real",
    contentWidth: "real",
    cursorDelegate: "Component",
    cursorPosition: "int",
    cursorRectangle: "rect",
    cursorVisible: { type: "bool", initialValue: true },
    effectiveHorizontalAlignment: "enum",
    horizontalAlignment: "enum",
    hoveredLink: "string",
    inputMethodComposing: "bool",
    inputMethodHints: "enum",
    length: "int",
    lineCount: "int",
    mouseSelectionMode: "enum",
    persistentSelection: "bool",
    readOnly: "bool",
    renderType: "enum",
    selectByKeyboard: { type: "bool", initialValue: true },
    selectByMouse: "bool",
    selectedText: "string",
    selectedTextColor: { type: "color", initialValue: "yellow" },
    selectionColor: { type: "color", initialValue: "pink" },
    selectionEnd: "int",
    selectionStart: "int",
    text: "string",
    textDocument: "TextDocument",
    textFormat: "enum",
    textMargin: "real",
    verticalAlignment: "enum",
    wrapMode: "enum"
  },
  signals: {
    linkActivated: [{ type: "string", name: "link" }],
    linkHovered: [{ type: "string", name: "link" }]
  },
  constructor:TextEdit
});
