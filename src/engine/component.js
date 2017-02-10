
class QMLContext {
  constructor() {
  }

  nameForObject(obj) {
    for (const name in this) {
      if (this[name] === obj) {
        return name;
      }
    }
    return undefined;
  }

  createChild(info, nested) {
    const childContext = Object.create(this);
    childContext.$info = info;

    // see properties.createProperty /
    // namespace setting in QMLBinding with(...) -s / QObject.$noalias.createChild / components.js.createChild :
    // we use "this", $pageElements and loader context in evaluation, as all the variable names other than elements
    // are either in "this"(and supers) or in parent(ie loader) context,

    // init always to blank
    childContext.$pageElements = {};
    childContext.$ownerObject = null;

    return childContext;
  }

  toString() {
    return this.$info;
  }
}


function createComponent(meta, flags) {
  const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
  return new QMLComponent(meta, flags);
}



QmlWeb.QMLContext = QMLContext;
QmlWeb.createComponent = createComponent;

