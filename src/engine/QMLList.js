function QMLList(meta, parent, loaderComponent) {
  const list = [];
  if (meta instanceof Array) {
    for (const i in meta) {
      // TODO gz
      list.push(QmlWeb.construct(meta[i], parent, loaderComponent));
    }
  } else if (meta instanceof QmlWeb.QMLMetaElement) {
    // TODO gz
    list.push(QmlWeb.construct(meta, parent, loaderComponent));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
