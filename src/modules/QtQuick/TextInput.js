QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "TextInput",
  versions: /.*/,
  baseClass: "Item",
  enums: {
    TextInput: { Normal: 0, Password: 1, NoEcho: 2, PasswordEchoOnEdit: 3 }
  },
  properties: {
    text: "string",
    maximumLength: { type: "int", initialValue: -1 },
    readOnly: "bool",
    validator: "var",
    echoMode: "enum" // TextInput.Normal
  },
  signals: {
    accepted: []
  }
}, class {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

    const QMLFont = QmlWeb.getConstructor("QtQuick", "2.0", "Font");
    this.font = new QMLFont(this);

    const input = this.impl = document.createElement("input");
    input.className = "qmltextinput";
    input.type = "text";
    input.disabled = true;
    this.dom.appendChild(input);
    this.setupFocusOnDom(input);
    input.disabled = false;

    this.Component.completed.connect(this, this.Component$onCompleted);
    this.textChanged.connect(this, this.$onTextChanged);
    this.echoModeChanged.connect(this, this.$onEchoModeChanged);
    this.maximumLengthChanged.connect(this, this.$onMaximumLengthChanged);
    this.readOnlyChanged.connect(this, this.$onReadOnlyChanged);
    this.Keys.pressed.connect(this, this.Keys$onPressed);

    this.impl.addEventListener("input", () => this.$updateValue());
  }
  Component$onCompleted() {
    this.implicitWidth = this.impl.offsetWidth;
    this.implicitHeight = this.impl.offsetHeight;
  }
  $onTextChanged(newVal) {
    // We have to check if value actually changes.
    // If we do not have this check, then after user updates text input
    // following occurs: user updates gui text -> updateValue gets called ->
    // textChanged gets called -> gui value updates again -> caret position
    // moves to the right!
    if (this.impl.value !== newVal) {
      this.impl.value = newVal;
    }
  }
  $onEchoModeChanged(newVal) {
    const TextInput = this.TextInput;
    const input = this.impl;
    switch (newVal) {
      case TextInput.Normal:
        input.type = "text";
        break;
      case TextInput.Password:
        input.type = "password";
        break;
      case TextInput.NoEcho:
        // Not supported, use password, that's nearest
        input.type = "password";
        break;
      case TextInput.PasswordEchoOnEdit:
        // Not supported, use password, that's nearest
        input.type = "password";
        break;
    }
  }
  $onMaximumLengthChanged(newVal) {
    this.impl.maxLength = newVal < 0 ? null : newVal;
  }
  $onReadOnlyChanged(newVal) {
    this.impl.disabled = newVal;
  }
  Keys$onPressed(e) {
    const Qt = QmlWeb.Qt;
    const submit = e.key === Qt.Key_Return || e.key === Qt.Key_Enter;
    if (submit && this.$testValidator()) {
      this.accepted();
      e.accepted = true;
    }
  }
  $testValidator() {
    if (this.validator) {
      return this.validator.validate(this.text);
    }
    return true;
  }
  $updateValue() {
    if (this.text !== this.impl.value) {
      this.text.set(this.impl.value, QMLPropertyFlags.Privileged);
    }
  }
});
