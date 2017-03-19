
class QMLContext {
  constructor(inheritedProperties) {
    this.$externalContext = inheritedProperties;
    this.$self = {};
    this.$contextProtoId = this.$objectId = ++objectIds;
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
    childContext.$contextProtoId = this.$objectId = ++objectIds;
    childContext.$info = info;
    childContext.$self = {};

    if (!(QMLComponentFlags.Nested & componentFlags) || (QMLComponentFlags._FirstDynamic & componentFlags)) {
      childContext.$pageElements = {};
      childContext.$pageContext = Object.create(childContext.$pageElements);
      childContext.$pageContext.$top = childContext;
    } else {
      // inherit page top $pageElements and $pageContext (Object.create(this) already do this) :
      // childContext.$pageElements = this.$pageElements;
      // childContext.$pageContext = this.$pageContext;
    }

    childContext.$externalContext = Object.create(childContext.$externalContext);

    return childContext;
  }

  // initializing $externalContext with lazy strategy, at the time we know, whether this context
  // is the first Super in chain of Nested components or something else
  splitExternalContext() {

    // see properties.createProperty /
    // namespace setting in QMLBinding with(...) -s / QObject.$noalias.createChild / components.js.createChild :
    // we use "this", $pageElements and loader context in evaluation, as all the variable names other than elements
    // are either in "this"(and supers) or in parent(ie loader) context,

    // #scope hierarchy:
    // very precise code don't change this ::
    // see also QMLComponent.init

    const old = this.$externalContext;

    this.$externalContext = {};

    QmlWeb.helpers.mergeProtoInPlace(this.$externalContext, old);
  }

  toString() {
    return this.$info;
  }
}


function createComponent(meta, flags, loaderComponent) {
  try {
    this.pushengine();
    const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
    return new QMLComponent(meta, flags, loaderComponent);
  } finally {
    this.popengine();
  }
}



QmlWeb.QMLContext = QMLContext;
QMLEngine.prototype.createComponent = createComponent;

