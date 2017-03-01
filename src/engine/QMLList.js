function QMLList(metaObject, parent, flags) {
  const list = [];
  if (metaObject instanceof Array) {
    for (const i in metaObject) {
      list.push(QmlWeb.createComponentAndElement({clazz:metaObject[i]}, parent, flags));
    }
  } else if (metaObject instanceof QmlWeb.QMLMetaElement) {
    list.push(QmlWeb.createComponentAndElement({clazz:metaObject}, parent, flags));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
