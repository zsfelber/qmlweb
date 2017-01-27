function QMLList(meta) {
  const list = [];
  if (meta.object instanceof Array) {
    for (const i in meta.object) {
      list.push(QmlWeb.construct({
        object: meta.object[i],
        parent: meta.parent,
        component: meta.component
      }));
    }
  } else if (meta.object instanceof QmlWeb.QMLMetaElement) {
    list.push(QmlWeb.construct({
      object: meta.object,
      parent: meta.parent,
      component: meta.component
    }));
  }

  return list;
}
QMLList.plainType = true;
QmlWeb.qmlList = QMLList;
