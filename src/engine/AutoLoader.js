window.addEventListener("load", () => {
  const metaTags = document.getElementsByTagName("body");
  for (let i = 0; i < metaTags.length; ++i) {
    const metaTag = metaTags[i];
    const source = metaTag.getAttribute("data-qml");
    if (source) {
      QmlWeb.qmlEngine = new QmlWeb.QMLEngine(undefined, {info:"AutoLoader.js"});
      QmlWeb.qmlEngine.loadFile(source);
      //QmlWeb.qmlEngine.start();
      break;
    }
  }
});
