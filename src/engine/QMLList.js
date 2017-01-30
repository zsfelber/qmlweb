function QMLList(meta, parent, flags) {
  const list = [];
  if (meta instanceof Array) {
    for (const i in meta) {
      // TODO gz
      list.push(QmlWeb.construct(meta[i], parent, flags));
    }
  } else if (meta instanceof QmlWeb.QMLMetaElement) {
    // TODO gz
    list.push(QmlWeb.construct(meta, parent, flags));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
