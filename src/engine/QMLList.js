function QMLList(meta, parent, nested) {
  const list = [];
  if (meta instanceof Array) {
    for (const i in meta) {
      // TODO gz
      list.push(QmlWeb.construct(meta[i], parent, nested));
    }
  } else if (meta instanceof QmlWeb.QMLMetaElement) {
    // TODO gz
    list.push(QmlWeb.construct(meta, parent, nested));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
