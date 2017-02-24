describe("QMLEngine.urls", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QMLEngine/qml/Urls");

  it("can parse remote url", function() {
    var url;
    url = QmlWeb.$parseUrl("http://localhost:9876/samples/debug.html");
    expect(url.scheme).toBe("http:");
    expect(url.path).toBe("/samples/");
    expect(url.port).toBe("9876");
    expect(url.prefix).toBe("//");

    url = QmlWeb.$parseUrl("qrc:/SomeDir/LoaderRelativeDots.qml");
    expect(url.scheme).toBe("qrc:");
    expect(url.prefix).toBe("");
    expect(url.path).toBe("/SomeDir/");

    url = QmlWeb.$parseUrl("qrc://SomeDir/LoaderRelativeDots.qml");
    expect(url.scheme).toBe("qrc:");
    expect(url.prefix).toBe("//");
    expect(url.path).toBe("/SomeDir/");

  });

  it("can parse local asbolute uri", function() {
    var url;
    url = QmlWeb.$parseUrl("/directory/samples/debug.html", true);
    expect(url.path).toBe("/directory/samples/");

    url = QmlWeb.$parseUrl("//directory/samples/debug.html", true);
    expect(url.path).toBe("/directory/samples/");
    expect(url.prefix).toBe("//");
  });

  it("Qt.resolvedUrl", function() {
    var qml = load("ResolvedUrl", this.div);
    /* Get the base address of the URL */
    const x = QmlWeb.resolveBasePath("/");

    expect(qml.outer).toBe(x.uri + "base/tests/");
    expect(qml.current).toBe(qml.outer + "QMLEngine/qml/");
    expect(qml.inner1).toBe(qml.current + "foo/bar");
    expect(qml.inner2).toBe(qml.current + "foo/bar/");
    expect(qml.inner3).toBe(qml.current + "foo/foo/lol/");
    expect(qml.absolute).toBe(x.uri + "foo/bar");
    expect(qml.full).toBe("http://example.com/bar");
  });

});
