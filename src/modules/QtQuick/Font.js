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
    this.$engine.initMeta(this, meta, QFont);
    this.Font = global.Font; // TODO: make a sane enum
    this.target = this.$parent;

    const Font = this.Font;
    const engine = this.$engine;
    const createProperty = engine.createProperty;

    engine.createProperty("bool", this, "bold");
    engine.createProperty("enum", this, "capitalization", { initialValue:
                                                      Font.MixedCase });
    engine.createProperty("string", this, "family", { initialValue: "sans-serif" });
    engine.createProperty("bool", this, "italic");
    engine.createProperty("real", this, "letterSpacing");
    engine.createProperty("int", this, "pixelSize", { initialValue: 13 });
    engine.createProperty("real", this, "pointSize", { initialValue: 10 });
    engine.createProperty("bool", this, "strikeout");
    engine.createProperty("bool", this, "underline");
    engine.createProperty("enum", this, "weight", { initialValue: Font.Normal });
    engine.createProperty("real", this, "wordSpacing");

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
    this.weightChanged.connect(this, this.$onWeightChanged);
    this.wordSpacingChanged.connect(this, this.$onWordSpacingChanged);
  }

  getTargetImplStyle() {
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
    if (!this.target) {
      console.log("Missing Font target : "+this.toString(1));
      return;
    }

    const val = `${newVal}px`;
    QmlWeb.setStyle(this.getTargetImplStyle(), "fontSize", val);
  }
  $onPointSizeChanged(newVal) {
    this.$sizeLock = true;
    this.pixelSize = Math.round(newVal / 0.75);
    this.$sizeLock = false;
  }
  $onStrikeoutChanged(newVal) {
    if (!this.target) {
      console.log("Missing Font target : "+this.toString(1));
      return;
    }
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "textDecoration", newVal
      ? "line-through"
      : this.target.font.underline
        ? "underline"
        : "none");
  }
  $onUnderlineChanged(newVal) {
    if (!this.target) {
      console.log("Missing Font target : "+this.toString(1));
      return;
    }
    const css = this.getTargetImplStyle();
    QmlWeb.setStyle(css, "textDecoration", this.target.font.strikeout
      ? "line-through"
      : newVal
        ? "underline"
        : "none");
  }
  $onWeightChanged(newVal) {
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
