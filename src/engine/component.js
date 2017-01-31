
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

    if (!childContext.$elements) {
      childContext.$elements = {};
    } else {
      childContext.$elements = Object.create(this.$elements);
      // NOTE see trick :
      // $noalias is inherited not from $noalias but full context,
      // because noalias only matters in context in this object's alias bindings to prevent access
      // it only this (or inherited) object' aliases : not the parent aliases (at least in my interpretation).
      childContext.$elements.$noalias = Object.create(this.$elements/*!!!!! .$noalias*/);
    }

    return childContext;
  }
}


function createComponent(meta, flags) {
  const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
  return new QMLComponent(meta, flags);
}



QmlWeb.QMLContext = QMLContext;
QmlWeb.createComponent = createComponent;

