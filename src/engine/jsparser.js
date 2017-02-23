// Load resolved file and parse as JavaScript
function importJavascript(file, importAlias, contextMap) {
  const engine = QmlWeb.engine;

  const url = QmlWeb.$parseUrl(file);
  if (!url) {
    return undefined;
  }

  const $c = QmlWeb.engine.$component.$context;
  const $p = $c.$pageContext;
  let jsBinding;
  /* it is cached to handle multiple includes of one */
  if ($p.$qmlJsIncludes === undefined) {
    $p.$qmlJsIncludes = {};
  } else if (jsBinding = $p.$qmlJsIncludes[url.uri]) {
    return jsBinding;
  }

  const owner = $p.$top.$ownerObject;

  let jsData;
  if (url.scheme === "qrc:") {
    jsData = QmlWeb.qrc[url.path];
  } else {
    QmlWeb.loadParser();
    jsData = QmlWeb.jsparse(QmlWeb.getUrlContents(url.uri));
  }

  if (!jsData) {
    return undefined;
  }

  // Remove any ".pragma" statements, as they are not valid JavaScript
  jsData.source = jsData.source.replace(/\.pragma.*(?:\r\n|\r|\n)/, "\n");

  jsBinding = new QmlWeb.QMLBinding(`(){
    ${jsData.source}
    ${jsData.exports.map(sym => `$$_contextMap.${sym} = ${sym};`).join("")}
  }`, undefined, QMLBindingFlags.ImplFunction);

  if (!contextMap) {
    jsBinding.contextMap = contextMap = {};
  }

  $p.$qmlJsIncludes[url.uri] = jsBinding;
  $p.$$_importAlias = importAlias;
  $p.$$_contextMap = contextMap;

  jsBinding.compile();
  jsBinding.boundRun = jsBinding.run.bind({binding:jsBinding, bindingObj:owner});
  jsBinding.boundRun();

  if (importAlias) {
    const $a = $p[importAlias];
    if ($a) {
      if ($a !== contextMap) {
        console.warn("Merging same-named import aliases : "+importAlias+"  in context: "+$c.$info);
        QmlWeb.helpers.copy($a, contextMap);
      }
    } else {
      $p[importAlias] = contextMap;
    }
  } else {
    QmlWeb.helpers.copy($p, contextMap);
  }
  delete $p.$$_contextMap;
  delete $p.$$_importAlias;

  return jsBinding;
}

QmlWeb.importJavascript = importJavascript;
