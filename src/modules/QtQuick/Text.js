var defaultTextStyle = QmlWeb.helpers.mergeObjects(QmlWeb.defaultItemStyle, {
  "whiteSpace": "pre",
  "wordWrap": "none",
  "textAlign": "left"
});

QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Text",
  versions: /.*/,
  baseClass: "Item",
  enums: {
    Text: {
      NoWrap: 0, WordWrap: 1, WrapAnywhere: 2, Wrap: 3,
      WrapAtWordBoundaryOrAnywhere: 4,
      AlignLeft: 1, AlignRight: 2, AlignHCenter: 4, AlignJustify: 8,
      AlignTop: 32, AlignBottom: 64, AlignVCenter: 128,
      Normal: 0, Outline: 1, Raised: 2, Sunken: 3
    }
  },
  properties: {
    color: { type: "color", initialValue: "black" },
    text: { type: "string", initialValue: ""},
    lineHeight: "real",
    wrapMode: { type: "enum", initialValue: 0 }, // Text.NoWrap
    horizontalAlignment: { type: "enum", initialValue: 1 }, // Text.AlignLeft
    style: "enum",
    styleColor: "color",
    maximumLineCount: "int" //TODO dummy
  }
}, class Text extends Item {
  constructor(meta) {
    super(meta);
    this.$engine.initMeta(this, meta, Text);

    const fc = this.impl = document.createElement("span");
    this.fcss = QmlWeb.createStyle(fc.style);
    fc.className = "qmltext";

    QmlWeb.setStyle(this.fcss, "textAlign", "left", defaultTextStyle);

    this.dom.appendChild(fc);

    const QMLFont = QmlWeb.getConstructor("QtQuick", "2.0", "Font");
    this.font = new QMLFont(this, {attached:true, info:"drag"});

    this.colorChanged.connect(this, this.$onColorChanged);
    this.textChanged.connect(this, this.$onTextChanged);
    this.lineHeightChanged.connect(this, this.$onLineHeightChanged);
    this.wrapModeChanged.connect(this, this.$onWrapModeChanged);
    this.horizontalAlignmentChanged.connect(this,
                                            this.$onHorizontalAlignmentChanged);
    this.styleChanged.connect(this, this.$onStyleChanged);
    this.styleColorChanged.connect(this, this.$onStyleColorChanged);

    this.font.family = "sans-serif";
    this.font.pointSize = 10;

    this.widthChanged.connect(this, this.$onWidthChanged);

    this.font.boldChanged.connect(this, this.$onFontChanged);
    this.font.weightChanged.connect(this, this.$onFontChanged);
    this.font.pixelSizeChanged.connect(this, this.$onFontChanged);
    this.font.pointSizeChanged.connect(this, this.$onFontChanged);
    this.font.familyChanged.connect(this, this.$onFontChanged);
    this.font.letterSpacingChanged.connect(this, this.$onFontChanged);
    this.font.wordSpacingChanged.connect(this, this.$onFontChanged);

    // 1 . http://stackoverflow.com/questions/6492683/how-to-detect-divs-dimension-changed
    // https://raw.githubusercontent.com/sdecima/javascript-detect-element-resize/master/detect-element-resize.js
    // 2 . https://www.npmjs.com/package/element-resize-detector
    //this.impl.addEventListener("resize", () => this.$updateImplicit());
    //addResizeListener(this.impl, this.$updateImplicit.bind(this));

    this.Component.completed.connect(this, this.Component$onCompleted);

    setTimeout(this.$updateImplicit.bind(this), 0);
  }
  $onColorChanged(newVal) {
    QmlWeb.setStyle(this.getImplStyle(), "color", new QmlWeb.QColor(newVal), defaultTextStyle);
  }
  $onTextChanged(newVal) {
    this.impl.innerHTML = newVal;
    this.$updateImplicit();
  }
  $onWidthChanged() {
    this.$updateImplicit();
  }
  $onLineHeightChanged(newVal) {
    QmlWeb.setStyle(this.getImplStyle(), "lineHeight", `${newVal}px`, defaultTextStyle);
    this.$updateImplicit();
  }
  $onStyleChanged(newVal) {
    this.$updateShadow(newVal, this.styleColor);
  }
  $onStyleColorChanged(newVal) {
    this.$updateShadow(this.style, new QmlWeb.QColor(newVal));
  }
  $onWrapModeChanged(newVal) {
    const css = this.getImplStyle();
    switch (newVal) {
      case this.Text.NoWrap:
        QmlWeb.setStyle(css, "whiteSpace", "pre", defaultTextStyle);
        QmlWeb.setStyle(css, "wordWrap", "none", defaultTextStyle);
        break;
      case this.Text.WordWrap:
        QmlWeb.setStyle(css, "whiteSpace", "pre-wrap", defaultTextStyle);
        QmlWeb.setStyle(css, "wordWrap", "normal", defaultTextStyle);
        break;
      case this.Text.WrapAnywhere:
        QmlWeb.setStyle(css, "whiteSpace", "pre-wrap", defaultTextStyle);
        QmlWeb.setStyle(css, "wordBreak", "break-all", defaultTextStyle);
        break;
      case this.Text.Wrap:
      case this.Text.WrapAtWordBoundaryOrAnywhere:
        QmlWeb.setStyle(css, "whiteSpace", "pre-wrap", defaultTextStyle);
        QmlWeb.setStyle(css, "wordWrap", "break-word", defaultTextStyle);
    }
    this.$updateJustifyWhiteSpace();
  }
  $onHorizontalAlignmentChanged(newVal) {
    const css = this.getImplStyle();
    let textAlign = null;
    switch (newVal) {
      case this.Text.AlignLeft:
        textAlign = "left";
        break;
      case this.Text.AlignRight:
        textAlign = "right";
        break;
      case this.Text.AlignHCenter:
        textAlign = "center";
        break;
      case this.Text.AlignJustify:
        textAlign = "justify";
        break;
    }
    QmlWeb.setStyle(this.css, "textAlign", textAlign, defaultTextStyle);
    this.$updateJustifyWhiteSpace();
  }
  $onFontChanged() {
    this.$updateImplicit();
  }
  Component$onCompleted() {
    this.$updateImplicit();
  }
  $updateImplicit() {
    if (!this.text || !this.dom) {
      this.implicitHeight = this.implicitWidth = 0;
      return;
    }

    if (!this.$isUsingImplicitWidth) {
      this.implicitWidth = this.impl.offsetWidth;
      this.implicitHeight = this.impl.offsetHeight;
      return;
    }

    const fc = this.impl;
    const engine = this.$engine;

    // Need to move the child out of it's parent so that it can properly
    // recalculate it's "natural" offsetWidth/offsetHeight
    if (engine.dom === document.body && engine.dom !== engine.domTarget) {
      // Can't use document.body here, as it could have Shadow DOM inside
      // The root is document.body, though, so it's probably not hidden
      engine.domTarget.appendChild(fc);
    } else {
      document.body.appendChild(fc);
    }
    const height = fc.offsetHeight;
    const width = fc.offsetWidth;
    this.dom.appendChild(fc);

    this.implicitHeight = height;
    this.implicitWidth = width;
  }
  $updateShadow(textStyle, styleColor) {
    const css = this.getImplStyle();
    switch (textStyle) {
      case 0:
        QmlWeb.setStyle(css, "textShadow", "none", defaultTextStyle);
        break;
      case 1:
        QmlWeb.setStyle(css, "textShadow", [
          `1px 0 0 ${styleColor}`,
          `-1px 0 0 ${styleColor}`,
          `0 1px 0 ${styleColor}`,
          `0 -1px 0 ${styleColor}`
        ].join(","), defaultTextStyle);
        break;
      case 2:
        QmlWeb.setStyle(css, "textShadow", `1px 1px 0 ${styleColor}`, defaultTextStyle);
        break;
      case 3:
        QmlWeb.setStyle(css, "textShadow", `-1px -1px 0 ${styleColor}`, defaultTextStyle);
        break;
    }
  }
  $updateJustifyWhiteSpace() {
    const css = this.getImplStyle();
    // AlignJustify doesn't work with pre/pre-wrap, so we decide the lesser of
    // the two evils to be ignoring "\n"s inside the text.
    if (this.horizontalAlignment === this.Text.AlignJustify) {
      QmlWeb.setStyle(css, "whiteSpace", "normal", defaultTextStyle);
    }
    this.$updateImplicit();
  }
});
