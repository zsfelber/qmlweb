//function QMLUrl(val) {
//  return QmlWeb.$resolvePath(`${val}`);
//}
//QMLUrl.plainType = true;
QmlWeb.qmlUrl = QmlWeb.$resolvePath;
QmlWeb.qmlUrl.plainType = true;
