function QMLList(meta, parent) {
  const list = [];
  if (meta.clazz instanceof Array) {
    for (const i in meta.clazz) {
      // TODO gz
      list.push(QmlWeb.construct(meta[i], parent));
    }
  } else if (meta.clazz instanceof QmlWeb.QMLMetaElement) {
    // TODO gz
    list.push(QmlWeb.construct(meta, parent));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
