var styleGroups = {};
var defaultItemStyle = {
  top:"0px", left:"0px",
  position:"absolute",
  boxSizing:"border-box"
};

function createStyle(css) {
  var style = { css };
  return style;
}

function setStyle(style, arg, value, defaultStyle = defaultItemStype) {
  style[arg] = value;
  if (value && defaultStyle[arg] !== value) {
    style.css[arg] = value;
  } else {
    delete style.css[arg];
  }
}

QmlWeb.createStyle = createStyle;
QmlWeb.setStyle = setStyle;
QmlWeb.defaultItemStyle = defaultItemStyle;
