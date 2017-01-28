function QMLList(meta, parent) {
  const list = [];
  if (meta.object instanceof Array) {
    for (const i in meta.object) {
      // TODO gz
      list.push(QmlWeb.construct(meta[i], parent));
    }
  } else if (meta.object instanceof QmlWeb.QMLMetaElement) {
    // TODO gz
    list.push(QmlWeb.construct(meta, parent));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
