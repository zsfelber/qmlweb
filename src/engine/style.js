var styleGroups = {};
var defaultItemStyle = {
  top:"0px", left:"0px",
  position:"absolute",
  boxSizing:"border-box",
  pointerEvents:"none",
  bottom: "0px",
  right: "0px",
  borderWidth: "0px",
  borderStyle: "solid",
  borderColor: "black",
  opacity: 1
};

function createStyle(css) {
  var style = css.$style;
  if (!style) {
    css.$style = style = { $css:css, $classes:{} };
  }
  return style;
}

function setStyle(style, arg, value, defaultStyle = defaultItemStyle) {
  style[arg] = value;
  if (value && defaultStyle[arg] !== value) {
    style.$css[arg] = value;
  } else {
    delete style.$css[arg];
  }
}

function addCssClass(elem, classname) {
  if (!new RegExp("\b"+classname+"\b").test(elem.className)) {
    elem.className+=" "+classname;
  }
}

function removeCssClass(elem, classname) {
  elem.className.replace(new RegExp("\s*\b"+classname+"\b/g"),"");
}

function setCssClass(elem, category, classname) {
  const style = createStyle(elem.style);
  let cur = style.$classes[category];
  if (cur) {
    if (cur !== classname) {
      removeCssClass(elem, cur);
      addCssClass(elem, classname);
    }
  } else {
    addCssClass(elem, classname);
  }
}


QmlWeb.createStyle = createStyle;
QmlWeb.setStyle = setStyle;
QmlWeb.defaultItemStyle = defaultItemStyle;
QmlWeb.addCssClass = addCssClass;
QmlWeb.removeCssClass = removeCssClass;
QmlWeb.setCssClass = setCssClass;
