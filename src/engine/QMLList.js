function QMLList(meta, parent, flags) {
  const list = [];
  if (meta instanceof Array) {
    for (const i in meta) {
      list.push(QmlWeb.loadSuperOrNested(meta[i], parent, flags));
    }
  } else if (meta instanceof QmlWeb.QMLMetaElement) {
    list.push(QmlWeb.loadSuperOrNested(meta, parent, flags));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
