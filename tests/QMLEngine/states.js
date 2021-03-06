describe("QMLEngine.states", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QMLEngine/qml/State");

  it("changes property values state is changed", function(done) {
    var qml = load("Simple", this.div, null, done);
    var count = 0;
    qml.yield = function() {
      console.log(qml.value);
      if (count === 0) {
        expect(qml.value).toBe(10);
      } else if (count === 1) {
        expect(qml.value).toBe(20);
      } else {
        expect(qml.value).toBe(10);
        done();
      }
      count += 1;
    };
    qml.start();
    failTimeout(2000, done);
  });

  it("changes state when conditions are met", function(done) {
    var qml = load("When", this.div, null, done);
    var count = 0;
    qml.yield = function() {
      console.log(qml.value);
      if (count === 0) {
        expect(qml.value).toBe(10);
      } else if (count === 1) {
        expect(qml.value).toBe(20);
      } else if (count === 2) {
        expect(qml.value).toBe(30);
      } else {
        expect(qml.value).toBe(10);
        done();
      }
      count += 1;
    };
    qml.start();
    failTimeout(2000, done);
  });
});
