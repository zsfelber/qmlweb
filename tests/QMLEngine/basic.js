
describe("QMLEngine.basic", function() {

  it("present", function() {
    expect(!!QmlWeb && !!QmlWeb.QMLEngine).toBe(true);
  });

  setupDivElement();
  var load = prefixedQmlLoader("QMLEngine/qml/Basic");
  it("createQmlObject", function() {
    var qml = load("CreateQmlObject", this.div);
    expect(qml.children.length).toBe(1);
    expect(qml.children[0].q).toBe(22);
    expect(this.div.innerText).toBe("variable from context = 42");
  });

  it("Component.onCompleted handlers of dynamically created objects get called",
    function() {
      var qml = load("CompletedOfDynamicObjects", this.div);
      expect(qml.children.length).toBe(1);
      expect(qml.color.toString()).toBe("cyan");
    }
  );

  it("signal parameters", function() {
    var qml = load("SignalParameters", this.div);
    expect(qml.propA).toBe(42);
    expect(qml.propB).toBe("foo");
  });

  it("SignalDisconnect", function() {
    // signal disconnect in the signal handler with many subscribers
    var qml = load("SignalDisconnect", this.div);
    expect(qml.log).toBe("i12i2");
  });

  it("signal disconnect when QObject deleted", function() {
    var qml = load("SignalDisconnectOnDelete", this.div);
    var child = qml.create_object();
    expect(qml.$tidyupList.indexOf(child.colorChanged)).toBe(-1);
    child.colorChanged.connect(qml, qml.foo);
    expect(qml.$tidyupList.indexOf(child.colorChanged)).not.toBeLessThan(0);
    child.destroy();
    expect(qml.$tidyupList.indexOf(child.colorChanged)).toBe(-1);
  });

  it("createObject", function() {
    var qml = load("CreateObject", this.div);
    expect(qml.children.length).toBe(1);
    expect(qml.children[0].q).toBe(22);
    expect(this.div.innerText).toBe("variable from context = 42");
  });
});
