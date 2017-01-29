let contextIds = 0;

class QMLContext {
  constructor() {
    this.$contextId = ++contextIds;
  }

  nameForObject(obj) {
    for (const name in this) {
      if (this[name] === obj) {
        return name;
      }
    }
    return undefined;
  }

  createChild() {
    const childContext = Object.create(this);
    childContext.$contextId = ++contextIds;

    if (!childContext.$elements) {
      childContext.$elements = {};
      childContext.$elementoverloads = {};
      childContext.$elementoverloadsnoalias = {};
    } else {
      childContext.$elements = Object.create(childContext.$elements);
      childContext.$elementoverloads = Object.create(childContext.$elementoverloads);
      childContext.$elementoverloadsnoalias = Object.create(childContext.$elementoverloadsnoalias);
    }

    return childContext;
  }
}


function createComponent(meta) {
  const QMLComponent = QmlWeb.getConstructor("QtQml", "2.0", "Component");
  return new QMLComponent(meta);
}



QmlWeb.QMLContext = QMLContext;
QmlWeb.createComponent = createComponent;

