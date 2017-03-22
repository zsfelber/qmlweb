// TODO complete implementation (with attributes `r`,`g` and `b`).

const colours = {"aliceblue":"#f0f8ff","antiquewhite":"#faebd7","aqua":"#00ffff","aquamarine":"#7fffd4","azure":"#f0ffff",
    "beige":"#f5f5dc","bisque":"#ffe4c4","black":"#000000","blanchedalmond":"#ffebcd","blue":"#0000ff","blueviolet":"#8a2be2","brown":"#a52a2a","burlywood":"#deb887",
    "cadetblue":"#5f9ea0","chartreuse":"#7fff00","chocolate":"#d2691e","coral":"#ff7f50","cornflowerblue":"#6495ed","cornsilk":"#fff8dc","crimson":"#dc143c","cyan":"#00ffff",
    "darkblue":"#00008b","darkcyan":"#008b8b","darkgoldenrod":"#b8860b","darkgray":"#a9a9a9","darkgreen":"#006400","darkkhaki":"#bdb76b","darkmagenta":"#8b008b","darkolivegreen":"#556b2f",
    "darkorange":"#ff8c00","darkorchid":"#9932cc","darkred":"#8b0000","darksalmon":"#e9967a","darkseagreen":"#8fbc8f","darkslateblue":"#483d8b","darkslategray":"#2f4f4f","darkturquoise":"#00ced1",
    "darkviolet":"#9400d3","deeppink":"#ff1493","deepskyblue":"#00bfff","dimgray":"#696969","dodgerblue":"#1e90ff",
    "firebrick":"#b22222","floralwhite":"#fffaf0","forestgreen":"#228b22","fuchsia":"#ff00ff",
    "gainsboro":"#dcdcdc","ghostwhite":"#f8f8ff","gold":"#ffd700","goldenrod":"#daa520","gray":"#808080","green":"#008000","greenyellow":"#adff2f",
    "honeydew":"#f0fff0","hotpink":"#ff69b4",
    "indianred ":"#cd5c5c","indigo":"#4b0082","ivory":"#fffff0","khaki":"#f0e68c",
    "lavender":"#e6e6fa","lavenderblush":"#fff0f5","lawngreen":"#7cfc00","lemonchiffon":"#fffacd","lightblue":"#add8e6","lightcoral":"#f08080","lightcyan":"#e0ffff","lightgoldenrodyellow":"#fafad2",
    "lightgrey":"#d3d3d3","lightgreen":"#90ee90","lightpink":"#ffb6c1","lightsalmon":"#ffa07a","lightseagreen":"#20b2aa","lightskyblue":"#87cefa","lightslategray":"#778899","lightsteelblue":"#b0c4de",
    "lightyellow":"#ffffe0","lime":"#00ff00","limegreen":"#32cd32","linen":"#faf0e6",
    "magenta":"#ff00ff","maroon":"#800000","mediumaquamarine":"#66cdaa","mediumblue":"#0000cd","mediumorchid":"#ba55d3","mediumpurple":"#9370d8","mediumseagreen":"#3cb371","mediumslateblue":"#7b68ee",
    "mediumspringgreen":"#00fa9a","mediumturquoise":"#48d1cc","mediumvioletred":"#c71585","midnightblue":"#191970","mintcream":"#f5fffa","mistyrose":"#ffe4e1","moccasin":"#ffe4b5",
    "navajowhite":"#ffdead","navy":"#000080",
    "oldlace":"#fdf5e6","olive":"#808000","olivedrab":"#6b8e23","orange":"#ffa500","orangered":"#ff4500","orchid":"#da70d6",
    "palegoldenrod":"#eee8aa","palegreen":"#98fb98","paleturquoise":"#afeeee","palevioletred":"#d87093","papayawhip":"#ffefd5","peachpuff":"#ffdab9","peru":"#cd853f","pink":"#ffc0cb","plum":"#dda0dd","powderblue":"#b0e0e6","purple":"#800080",
    "rebeccapurple":"#663399","red":"#ff0000","rosybrown":"#bc8f8f","royalblue":"#4169e1",
    "saddlebrown":"#8b4513","salmon":"#fa8072","sandybrown":"#f4a460","seagreen":"#2e8b57","seashell":"#fff5ee","sienna":"#a0522d","silver":"#c0c0c0","skyblue":"#87ceeb","slateblue":"#6a5acd","slategray":"#708090","snow":"#fffafa","springgreen":"#00ff7f","steelblue":"#4682b4",
    "tan":"#d2b48c","teal":"#008080","thistle":"#d8bfd8","tomato":"#ff6347","turquoise":"#40e0d0",
    "violet":"#ee82ee",
    "wheat":"#f5deb3","white":"#ffffff","whitesmoke":"#f5f5f5",
    "yellow":"#ffff00","yellowgreen":"#9acd32"};

const p255 = 1.0/255.0;

class QColor {
  constructor(val) {
    this.$value = "black";
    if (val instanceof QColor) {
      // Copy constructor
      this.$value = val.$value;
    } else if (typeof val === "string") {
      this.$fromstr(val);
    } else if (typeof val === "number") {
      this.$fromnum(val);
    } else if (val instanceof Array) {
      this.$from4(val);
    } else {
      throw new Error("Unsupported color value : "+val);
    }
  }

  toString() {
    return this.$value;
  }
  toCssValue() {
    const val = this.$value;
    if (/^\#([0-9a-fA-F]+)$/.test(val)) {
      const argb = this.$to4();
      return `rgba(${argb[1]}, ${argb[2]}, ${argb[3]}, ${argb[0]*p255})`;
    } else {
      return val;
    }
  }

  $get() {
    // Returns the same instance for all equivalent colors.
    // NOTE: the returned value should not be changed using method calls, if
    // those would be added in the future, the returned value should be wrapped.
    if (!QColor.$colors[this.$value]) {
      if (QColor.$colorsCount >= QColor.comparableColorsLimit) {
        // Too many colors created, bail out to avoid memory hit
        return this;
      }
      QColor.$colors[this.$value] = this;
      QColor.$colorsCount++;
      if (QColor.$colorsCount === QColor.comparableColorsLimit) {
        QmlWeb.warn(
          "QmlWeb: the number of QColor instances reached the limit set in",
          "QmlWeb.QColor.comparableColorsLimit. Further created colors would",
          "not be comparable to avoid memory hit."
        );
      }
    }
    return QColor.$colors[this.$value];
  }

  $tonum() {
    var val = this.$value,cap;
    if (cap=/^\#([0-9a-fA-F]+)$/.exec(val)) {
      val = parseInt("0x"+cap[1]);
      if (val < 0x1000000) {// alpha not defined  -> 255
        val += 0xff000000;
      }
    } else {
      val = colours[val];
      val += 0xff000000;
    }
    return val;
  }
  $to4() {
    var a = this.$tonum();
    var result = [a&0xff000000,a&0x00ff0000,a&0x0000ff00,a&0x000000ff];
    return result;
  }

  $fromstr(val) {
    let cap;
    if (cap=/^\#([0-9a-fA-F]+)$/.exec(val)) {
      this.$value = `${cap[0]}`.toLowerCase();
      if (this.$value.length === 4) {
        this.$value = "#"+this.$value[1]+this.$value[1]+this.$value[2]+this.$value[2]+this.$value[3]+this.$value[3];
      }

      const num = this.$tonum();
      this.$fromnum(num);
    } else {
      this.$value = val.toLowerCase();
    }
  }

  $fromnum(val) {
    // we assume it is int value and must be converted to css hex with padding
    val = Math.round(val);
    if (val < 0x1000000) {// alpha not defined  -> 255
      val += 0xff000000;
    }

    const argb = val.toString(16).substr(-8).toLowerCase();
    this.$value = `#${argb}`;
  }
  $from4(a) {
    this.$value = ((Math.max(0,a[0])&0xff000000)<<6) + ((Math.max(0,a[1])&0x00ff0000)<<4) + ((Math.max(0,a[2])&0x0000ff00)<<2) + (Math.max(0,a[3])&0x000000ff);
  }

  static $construct(val) {
    return new QColor(val);
  }
  static $add(a,b) {
    a = a.$to4 ? a.$to4() : a;
    b = b.$to4 ? b.$to4() : b;
    result = [a[0]+b[0], a[1]+b[1], a[2]+b[2], a[3]+b[3]];
    return result;
  }
  static $subtract(a,b) {
    a = a.$to4 ? a.$to4() : a;
    b = b.$to4 ? b.$to4() : b;
    result = [a[0]-b[0], a[1]-b[1], a[2]-b[2], a[3]-b[3]];
    return result;
  }
  static $multiply(a,b) {
    a = a.$to4 ? a.$to4() : a;
    b = b.$to4 ? b.$to4() : b;
    if (a instanceof Array) {
      a = a.$to4();
      result = [a[0]*b, a[1]*b, a[2]*b, a[3]*b];
    } else {
      b = b.$to4();
      result = [b[0]*a, b[1]*a, b[2]*a, b[3]*a];
    }
    return result;
  }
}
QColor.$colors = {};
QColor.$colorsCount = 0;
QColor.comparableColorsLimit = 10000;
QColor.valueType = true;
QmlWeb.QColor = QColor;
