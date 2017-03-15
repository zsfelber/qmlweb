describe("QMLEngine.importPath", function() {
  setupDivElement();

  it("importPathList default", function() {
    var engine = new QmlWeb.QMLEngine(this.div);
    var paths = engine.userAddedImportPaths;
    expect(Array.isArray(paths)).toBe(true);
    expect(paths.length).toBe(0);
  });

  it("addImportPath", function() {
    var engine = new QmlWeb.QMLEngine(this.div);

    $$engine.addImportPath("http://example.org/path/to/qml");
    expect(engine.userAddedImportPaths.length).toBe(1);
    expect(typeof engine.userAddedImportPaths[0]).toBe("string");
    expect(engine.userAddedImportPaths[0]).toBe("http://example.org/path/to/qml");

    $$engine.addImportPath("http://example.org/second/path");
    expect(engine.userAddedImportPaths.length).toBe(2);
    expect(engine.userAddedImportPaths[0]).toBe("http://example.org/path/to/qml");
    expect(engine.userAddedImportPaths[1]).toBe("http://example.org/second/path");
  });

  it("setImportPathList", function() {
    var engine = new QmlWeb.QMLEngine(this.div);

    $$engine.addImportPath("http://example.org/path/to/qml");
    $$engine.addImportPath("http://example.org/second/path");

    $$engine.setImportPathList([]);
    expect(engine.userAddedImportPaths.length).toBe(0);

    $$engine.addImportPath("http://example.org/path/to/qml");
    expect(engine.userAddedImportPaths.length).toBe(1);

    $$engine.setImportPathList(["http://example.org/path3"]);
    expect(engine.userAddedImportPaths.length).toBe(1);
    expect(engine.userAddedImportPaths[0]).toBe("http://example.org/path3");

    $$engine.setImportPathList(["http://example.org/4", "http://example.org/5"]);
    expect(engine.userAddedImportPaths.length).toBe(2);
    expect(engine.userAddedImportPaths[0]).toBe("http://example.org/4");
    expect(engine.userAddedImportPaths[1]).toBe("http://example.org/5");
  });
});
