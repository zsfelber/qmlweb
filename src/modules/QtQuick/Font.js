QmlWeb.registerQmlType({
  module: "QtQuick",
  name: "Font",
  versions: /.*/,
  baseClass: "QtQml.QtObject",
  properties: {
    target: "QtObject",
  }
}, class QFont extends QObject {
  constructor(parent, meta) {
    super(parent, meta);
    QmlWeb.initMeta(this, meta, QFont);
    this.Font = global.Font; // TODO: make a sane enum
    this.target = this.$parent;

    const Font = this.Font;
    const createProperty = QmlWeb.createProperty;

    createProperty("bool", this, "bold");
    createProperty("enum", this, "capitalization", { initialValue:
                                                      Font.MixedCase });
    createProperty("string", this, "family", { initialValue: "sans-serif" });
    createProperty("bool", this, "italic");
    createProperty("real", this, "letterSpacing");
    createProperty("int", this, "pixelSize", { initialValue: 13 });
    createProperty("real", this, "pointSize", { initialValue: 10 });
    createProperty("bool", this, "strikeout");
    createProperty("bool", this, "underline");
    createProperty("enum", this, "weight", { initialValue: Font.Normal });
    createProperty("real", this, "wordSpacing");

    this.$sizeLock = false;

    this.boldChanged.connect(this, this.$onBoldChanged);
    this.capitalizationChanged.connect(this, this.$onCapitalizationChanged);
    this.familyChanged.connect(this, this.$onFamilyChanged);
    this.italicChanged.connect(this, this.$onItalicChanged);
    this.letterSpacingChanged.connect(this, this.$onLetterSpacingChanged);
    this.pixelSizeChanged.connect(this, this.$onPixelSizeChanged);
    this.pointSizeChanged.connect(this, this.$onPointSizeChanged);
    this.strikeoutChanged.connect(this, this.$onStrikeoutChanged);
    this.underlineChanged.connect(this, this.$onUnderlineChanged);
    this.weightChanged.connect(this, this.$onWidthChanged);
    this.wordSpacingChanged.connect(this, this.$onWordSpacingChanged);
  }

  getTargetImplStyle() {
    // TODO firstChild : it's a draft
    //return this.fcss ? this.fcss : this.fcss = QmlWeb.createStyle(this.target.dom.firstChild.style);
    return this.target.getImplStyle();
  }

  $onBoldChanged(newVal) {
    const Font = this.Font;
    this.weight = newVal ? Font.Bold : Font.Normal;
  }
  $onCapitalizationChanged(newVal) {
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "fontVariant", newVal === this.Font.SmallCaps ? "small-caps" : "none");
    QmlWeb.setStyle(css, "textTransform", this.$capitalizationToTextTransform(newVal));
  }
  $onFamilyChanged(newVal) {
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "fontFamily", newVal);
  }
  $onItalicChanged(newVal) {
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "fontStyle", newVal ? "italic" : "normal");
  }
  $onLetterSpacingChanged(newVal) {
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "letterSpacing", newVal !== undefined ? `${newVal}px` : "");
  }
  $onPixelSizeChanged(newVal) {
    if (!this.$sizeLock) {
      this.pointSize = newVal * 0.75;
    }
    const val = `${newVal}px`;
    this.$parent.dom.QmlWeb.setStyle(css, "fontSize", val);
    getTargetImplStyle().fontSize = val;
  }
  $onPointSizeChanged(newVal) {
    this.$sizeLock = true;
    this.pixelSize = Math.round(newVal / 0.75);
    this.$sizeLock = false;
  }
  $onStrikeoutChanged(newVal) {
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "textDecoration", newVal
      ? "line-through"
      : this.$parent.font.underline
        ? "underline"
        : "none");
  }
  $onUnderlineChanged(newVal) {
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "textDecoration", this.$parent.font.strikeout
      ? "line-through"
      : newVal
        ? "underline"
        : "none");
  }
  $onWidthChanged(newVal) {
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "fontWeight", this.$weightToCss(newVal));
  }
  $onWordSpacingChanged(newVal) {
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "wordSpacing", newVal !== undefined ? `${newVal}px` : "");
  }

  $weightToCss(weight) {
    const Font = this.Font;
    switch (weight) {
      case Font.Thin: return "100";
      case Font.ExtraLight: return "200";
      case Font.Light: return "300";
      case Font.Normal: return "400";
      case Font.Medium: return "500";
      case Font.DemiBold: return "600";
      case Font.Bold: return "700";
      case Font.ExtraBold: return "800";
      case Font.Black: return "900";
    }
    return "normal";
  }
  $capitalizationToTextTransform(capitalization) {
    const Font = this.Font;
    switch (capitalization) {
      case Font.AllUppercase: return "uppercase";
      case Font.AllLowercase: return "lowercase";
      case Font.Capitalize: return "capitalize";
    }
    return "none";
  }
});
