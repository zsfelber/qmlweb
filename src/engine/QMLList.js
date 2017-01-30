function QMLList(meta, parent, flags) {
  const list = [];
  if (meta instanceof Array) {
    for (const i in meta) {
      list.push(QmlWeb.addQmlElement(meta[i], parent));
    }
  } else if (meta instanceof QmlWeb.QMLMetaElement) {
    list.push(QmlWeb.addQmlElement(meta, parent));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
