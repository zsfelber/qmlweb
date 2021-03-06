describe("QMLEngine.urls", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QMLEngine/qml/Urls");

  it("can parse remote url", function() {
    var url;
    url = $$engine.$parseUrl("http://localhost:9876/samples/debug.html");
    expect(url.scheme).toBe("http:");
    expect(url.path).toBe("/samples/");
    expect(url.host).toBe("localhost:9876");
    expect(url.port).toBe("9876");
    expect(url.prefix).toBe("//");

    url = $$engine.$parseUrl("qrc:/SomeDir/LoaderRelativeDots.qml");
    expect(url.scheme).toBe("qrc:");
    expect(url.prefix).toBe("");
    expect(url.host).toBe("");
    expect(url.path).toBe("/SomeDir/");

    url = $$engine.$parseUrl("qrc://SomeDir/LoaderRelativeDots.qml");
    expect(url.scheme).toBe("qrc:");
    expect(url.prefix).toBe("//");
    expect(url.host).toBe("SomeDir");
    expect(url.path).toBe("/");

    url = $$engine.$parseUrl("ftp:////localhost");
    expect(url.host).toBe("localhost");
    expect(url.port).toBe(undefined);
    expect(url.prefix).toBe("//");
    expect(url.path).toBe("");
    expect(url.file).toBe("");

  });

  it("can parse local asbolute uri", function() {
    var url;
    url = $$engine.$parseUrl("/directory/samples/debug.html", true);
    expect(url).not.toBe(undefined);
    expect(url.path).toBe("/directory/samples/");

    url = $$engine.$parseUrl("//directory/samples/debug.html", true);
    expect(url.host).toBe("directory");
    expect(url.hostname).toBe("directory");
    expect(url.path).toBe("/samples/");
    expect(url.prefix).toBe("//");
  });

  it("Qt.resolvedUrl", function() {
    var qml = load("ResolvedUrl", this.div);
    /* Get the base address of the URL */
    const x = $$engine.resolveBasePath("/");

    expect(qml.outer).toBe(x.uri + "base/tests/");
    expect(qml.current).toBe(qml.outer + "QMLEngine/qml/");
    expect(qml.inner1).toBe(qml.current + "foo/bar");
    expect(qml.inner2).toBe(qml.current + "foo/bar/");
    expect(qml.inner3).toBe(qml.current + "foo/foo/lol/");
    expect(qml.absolute).toBe(x.uri + "foo/bar");
    expect(qml.full).toBe("http://example.com/bar");
  });

});
