// Load resolved file and parse as JavaScript
function importJavascript(file) {
  const engine = QmlWeb.engine;

  const uri = QmlWeb.$parseURI(file);
  if (!uri) {
    return undefined;
  }

  const $c = QmlWeb.engine.$component.$context;
  const $p = $c.$pageContext;
  let jsBinding;
  /* it is cached to handle multiple includes of one */
  if ($p.$qmlJsIncludes === undefined) {
    $p.$qmlJsIncludes = {};
  } else if (jsBinding = $p.$qmlJsIncludes[uri]) {
    return jsBinding;
  }

  const owner = $p.$top.$ownerObject;

  let jsData;
  if (uri.scheme === "qrc:/") {
    jsData = QmlWeb.qrc[uri.path];
  } else {
    QmlWeb.loadParser();
    jsData = QmlWeb.jsparse(QmlWeb.getUrlContents(file));
  }

  if (!jsData) {
    return undefined;
  }

  // Remove any ".pragma" statements, as they are not valid JavaScript
  jsData.source = jsData.source.replace(/\.pragma.*(?:\r\n|\r|\n)/, "\n");

  const contextMap = {};
  jsBinding = new QmlWeb.QMLBinding(`(){
    ${jsData.source}
    ${jsData.exports.map(sym => `contextMap.${sym} = ${sym};`).join("")}
  }`, undefined, QMLBindingFlags.ImplFunction);

  $p.$qmlJsIncludes[uri] = jsBinding;

  jsBinding.boundRun = jsBinding.run.bind({binding:jsBinding, bindingObj:owner});
  jsBinding.contextMap = contextMap;
  jsBinding.boundRun();

  return jsBinding;
}

QmlWeb.importJavascript = importJavascript;
