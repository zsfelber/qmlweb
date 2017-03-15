function QMLList(metaObject, parent, flags) {
  const engine = QmlWeb.getEngine(parent?parent.$engine:null);
  const list = [];
  if (metaObject instanceof Array) {
    for (const i in metaObject) {
      list.push(engine.createComponentAndElement({clazz:metaObject[i]}, parent, flags));
    }
  } else if (metaObject instanceof QmlWeb.QMLMetaElement) {
    list.push(engine.createComponentAndElement({clazz:metaObject}, parent, flags));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
