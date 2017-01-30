
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
      childContext.$elementoverloads = {};
      childContext.$elementoverloadsnoalias = {};
    } else {
      childContext.$elements = Object.create(this.$elements);
      childContext.$elementoverloads = Object.create(this.$elementoverloads);
      childContext.$elementoverloadsnoalias = Object.create(this.$elementoverloadsnoalias);
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

