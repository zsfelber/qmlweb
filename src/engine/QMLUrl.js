//function QMLUrl(val) {
//  return QmlWeb.$resolvePath(`${val}`);
//}
//QMLUrl.plainType = true;
//QmlWeb.qmlUrl = QMLUrl;
QMLEngine.prototype.$resolvePath.plainType = true;
