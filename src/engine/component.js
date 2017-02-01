
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

  createChild(info) {
    const childContext = Object.create(this);
    childContext.$info = info;

    // see properties.createProperty /
    // namespace setting in QMLBinding with(...) -s / QObject.$noalias.createChild / components.js.createChild :
    // we use $withelements in evaluation, all the variable names are either in "this" or in parent context,
    // except the elements in "this" : we merge them into $withelements
    if (!childContext.$elements) {
      childContext.$elements = {};
      childContext.$withelements = {};
      childContext.$ownerObject = null;
    } else {
      childContext.$elements = {};
      childContext.$withelements = Object.create(this);
      childContext.$ownerObject = null;
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

