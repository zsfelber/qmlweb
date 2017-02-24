
class QMLContext {
  constructor() {
    this.$inheritedProperties = this;
  }

  nameForObject(obj) {
    for (const name in this) {
      if (this[name] === obj) {
        return name;
      }
    }
    return undefined;
  }

  createChild(info, nestedOrFirstSuper) {
    const childContext = Object.create(this);
    childContext.$info = info;

    // see properties.createProperty /
    // namespace setting in QMLBinding with(...) -s / QObject.$noalias.createChild / components.js.createChild :
    // we use "this", $pageElements and loader context in evaluation, as all the variable names other than elements
    // are either in "this"(and supers) or in parent(ie loader) context,

    if (QmlWeb.QMLComponentFlags.Nested & nestedOrFirstSuper) {
      childContext.$inheritedProperties = Object.create(childContext.$inheritedProperties);
    } else if (QmlWeb.QMLComponentFlags.FirstSuper & nestedOrFirstSuper) {
      childContext.$inheritedProperties = Object.create(childContext.$inheritedProperties);
    } else {
      childContext.$inheritedProperties = {};
      childContext.$pageElements = {};
      childContext.$pageContext = Object.create(childContext.$pageElements);
      childContext.$pageContext.$top = childContext;
    }

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

