
class QMLContext {
  constructor(inheritedProperties) {
    this.$inheritedProperties = inheritedProperties;
    this.self = {};
  }

  nameForObject(obj) {
    for (const name in this) {
      if (this[name] === obj) {
        return name;
      }
    }
    return undefined;
  }

  createChild(info, componentFlags) {
    const childContext = Object.create(this);
    childContext.$info = info;
    childContext.self = {};

    // see properties.createProperty /
    // namespace setting in QMLBinding with(...) -s / QObject.$noalias.createChild / components.js.createChild :
    // we use "this", $pageElements and loader context in evaluation, as all the variable names other than elements
    // are either in "this"(and supers) or in parent(ie loader) context,

    // #scope hierarchy:
    // very precise code don't change this ::
    // see also QMLComponent.init

    if (QmlWeb.QMLComponentFlags.NestedOrFirst & componentFlags) {
      childContext.$inheritedProperties = Object.create(childContext.$inheritedProperties);
    } else {
      childContext.$inheritedProperties = {};
    }

    if (QmlWeb.QMLComponentFlags.Nested & componentFlags) {
      // inherit page top $pageElements and $pageContext (Object.create(this) already do this) :
      // childContext.$pageElements = this.$pageElements;
      // childContext.$pageContext = this.$pageContext;
    } else {
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


function createComponent(meta, flags, loaderComponent) {
  const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
  return new QMLComponent(meta, flags, loaderComponent);
}



QmlWeb.QMLContext = QMLContext;
QmlWeb.createComponent = createComponent;

