function importJavascriptInContext(contextSetter, $component) {
  /* Set the QmlWeb.engine.$component so that any internal calls to Qt.include
   * will have the proper context */
  var prevComponent = QmlWeb.engine.$component;
  QmlWeb.engine.$component = $component;

  try {
    contextSetter($context);
  } finally {
    QmlWeb.engine.$component = prevComponent;
  }
}

QmlWeb.importJavascriptInContext = importJavascriptInContext;
