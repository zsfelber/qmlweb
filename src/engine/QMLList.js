function QMLList(meta, parent) {
  const list = [];
  if (meta instanceof Array) {
    for (const i in meta) {
      // TODO gz
      list.push(QmlWeb.construct(meta[i], parent));
    }
  } else if (meta instanceof QmlWeb.QMLMetaElement) {
    // TODO gz
    list.push(QmlWeb.construct(meta, parent));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
