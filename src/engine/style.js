var styleGroups = {};
var defaultItemStyle = {
  top:"0px", left:"0px",
  position:"absolute",
  boxSizing:"border-box",
  pointerEvents:"none"
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

function addClass(elem, classname) {
  if (!new RegExp("\b"+classname+"\b").test(elem.className)) {
    elem.className+=" "+classname;
  }
}

function removeClass(elem, classname) {
  elem.className.replace(new RegExp("\s*\b"+classname+"\b/g"),"");
}

function setClass(elem, category, classname) {
  const style = createStyle(elem.style);
  let cur = style.$classes[category];
  if (cur) {
    if (cur !== classname) {
      removeClass(elem, cur);
      addClass(elem, classname);
    }
  } else {
    addClass(elem, classname);
  }
}


QmlWeb.createStyle = createStyle;
QmlWeb.setStyle = setStyle;
QmlWeb.defaultItemStyle = defaultItemStyle;
QmlWeb.addClass = addClass;
QmlWeb.removeClass = removeClass;
QmlWeb.setClass = setClass;
