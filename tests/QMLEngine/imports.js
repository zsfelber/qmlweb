describe("QMLEngine.imports", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QMLEngine/qml/Import");

  it("Javascript", function() {
    var qml = load("Javascript", this.div);
    var div = this.div.children[0];
    expect(div.offsetWidth).toBe(20);
    expect(div.offsetHeight).toBe(10);
    expect(div.children[0].style.backgroundColor).toBe("rgb(255, 0, 255)");
  });
  it("Javascript Qt.include", function() {
    var qml = load("JavascriptInclude", this.div);
    expect(qml.value).toBe(42);
  });
  it("Javascript scope", function() {
    var qml = load("JavascriptScope", this.div);

    expect(qml.importedColor()).toBe("magenta");
    expect(qml.component.importedColor()).toBe("magenta");
    expect(qml.component2.importedColor()).toBe("magenta");
    expect(qml.repeater.itemAt(0).importedColor()).toBe("magenta");
    expect(qml.repeater.itemAt(1).importedColor()).toBe("magenta");
    expect(qml.loader.item.importedColor()).toBe("magenta");

    qml.setImportedColor("black");
    expect(qml.importedColor()).toBe("black");
    expect(qml.component.importedColor()).toBe("magenta");
    expect(qml.component2.importedColor()).toBe("magenta");
    expect(qml.repeater.itemAt(0).importedColor()).toBe("magenta");
    expect(qml.repeater.itemAt(1).importedColor()).toBe("magenta");
    expect(qml.loader.item.importedColor()).toBe("magenta");

    qml.component.setImportedColor("white");
    expect(qml.importedColor()).toBe("black");
    expect(qml.component.importedColor()).toBe("white");
    expect(qml.component2.importedColor()).toBe("magenta");
    expect(qml.repeater.itemAt(0).importedColor()).toBe("magenta");
    expect(qml.repeater.itemAt(1).importedColor()).toBe("magenta");
    expect(qml.loader.item.importedColor()).toBe("magenta");

    qml.repeater.itemAt(0).setImportedColor("red");
    expect(qml.importedColor()).toBe("black");
    expect(qml.component.importedColor()).toBe("white");
    expect(qml.component2.importedColor()).toBe("magenta");
    expect(qml.repeater.itemAt(0).importedColor()).toBe("red");
    expect(qml.repeater.itemAt(1).importedColor()).toBe("magenta");
    expect(qml.loader.item.importedColor()).toBe("magenta");

    qml.loader.item.setImportedColor("green");
    expect(qml.importedColor()).toBe("black");
    expect(qml.component.importedColor()).toBe("white");
    expect(qml.component2.importedColor()).toBe("magenta");
    expect(qml.repeater.itemAt(0).importedColor()).toBe("red");
    expect(qml.repeater.itemAt(1).importedColor()).toBe("magenta");
    expect(qml.loader.item.importedColor()).toBe("green");
  });
  it("Qmldir", function() {
    load("Qmldir", this.div);
    var div = this.div.children[0];
    expect(div.offsetWidth).toBe(50);
    expect(div.offsetHeight).toBe(100);
    expect(div.children[0].style.backgroundColor).toBe("green");
    // #0ff and cyan doesn't work, because PhantomJS converts
    // them to rgb( 0,255,255 ).. how to compare colors?..
  });
  it("can import from sibling directory", function() {
    var qml = load("From/SiblingDir", this.div);
    expect(qml.text).toBe("I'm simple");
  });
  it("can import from parent directory", function() {
    var qml = load("From/ParentDir", this.div);
    expect(qml.value).toBe(5);
  });
  it("can import from directory without qmldir file", function() {
    var qml = load("NoQmldir", this.div);
    expect(qml.value).toBe(67);
  });
  it("module imports are local to file, should succeed", function() {
    var qml = load("LocalToFile/ModuleSucceed", this.div);
    expect(!qml.data).toBe(false);
    if (qml.data) {
      expect(qml.data.length).toBe(2);
      const elem1 = qml.data[0];
      const ws1 = qml.data[1];
      expect(ws1.$classname).toBe("[WebSocket]");
      expect(!elem1.data).toBe(false);
      if (elem1.data) {
        expect(elem1.data.length).toBe(1);
        const ws2 = elem1.data[0];
        expect(ws2.$classname).toBe("[WebSocket]");
      }
    }
  });
  it("module imports are local to file, should fail 1", function() {
    var qml = load("LocalToFile/ModuleFail1", this.div);
    expect(!qml.data).toBe(false);
    if (qml.data) {
      expect(qml.data.length).toBe(1);
      const elem1 = qml.data[0];
      expect(elem1.$classname).toBe("[ModuleFailSomeComponent]");
      expect(!elem1.data).toBe(false);
      if (elem1.data) {
        expect(elem1.data.length).toBe(0);
      }
    }
  });
  it("module imports are local to file, should fail 2", function() {
    var qml = load("LocalToFile/ModuleFail2", this.div);
    expect(!qml.data).toBe(false);
    if (qml.data) {
      expect(qml.data.length).toBe(1);
      const elem1 = qml.data[0];
      expect(elem1.$classname).toBe("[ModuleFailSomeComponent]");
      expect(!elem1.data).toBe(false);
      if (elem1.data) {
        expect(elem1.data.length).toBe(0);
      }
    }
  });
  it("directory imports are local to file, should fail", function() {
    const x = $$engine.resolveBasePath("/");
    try {
      load("LocalToFile/DirectoryFail", this.div);
      expect("It Should throw exception! Its message : ").toBe("QML class or constructor not found : tests/QMLEngine/qml/ImportLocalToFile/ImportMe.qml");
    } catch (err) {
      expect(["QML class or constructor not found : "+x.uri+"base/tests/QMLEngine/qml/ImportLocalToFile/ImportMe.qml",
             "QML class or constructor not found : base/tests/QMLEngine/qml/ImportLocalToFile/ImportMe.qml"]).toContain(err.message);
    }
  });
  it("can find local Component assigned to property when in another directory",
  function() {
    var qml = load("LocalComponentAsPropertyInAnotherDir", this.div);
    expect(qml.value).toBe(67);
  });
  it("qualified imports from module", function() {
    var qml = load("QualifiedModule", this.div);
    expect(qml.value).toBe(67);
  });
  it("qualified from directory without qmldir file", function() {
    var qml = load("QualifiedNoQmldir", this.div);
    expect(qml.value).toBe(67);
  });
});
