describe("QtQuick.Text", function() {
  setupDivElement();

  var load = prefixedQmlLoader("QtQuick/qml/Text");
  it("implicit size", function(done) {
    var qml = load("ImplicitSize", this.div);
    setTimeout(function() {
      expect(qml.text_item.width).toBeGreaterThan(0);
      done();
    }, 100);
    failTimeout(2000, done);
  });

  it("default wrap mode", function() {
    var qml = load("WrapMode", this.div);
    expect(qml.dom.children[0].style.whiteSpace).toBe("");
  });
});

