describe("QtQuick.Timer", function() {
  setupDivElement();
  beforeEach(function() {
    jasmine.addMatchers(customMatchers);
  });

  var load = prefixedQmlLoader("QtQuick/qml/Timer");
  it("can roughly set short intervals", function(done) {
    var qml = load("Singleshot", this.div, null, done);
    qml.interval = 50;
    var now = new Date();
    qml.yield = function(arg) {
      const oe = QmlWeb.engine;
      try {
        QmlWeb.engine = done.engine;
      var t = new Date() - now;
      expect(t).toBeRoughly(50, 1);
      done();
      } finally {
        QmlWeb.engine = oe;
      }
    };
    qml.start();
    failTimeout(2000, done);
  });

  it("can roughly set short intervals", function(done) {
    var qml = load("Singleshot", this.div, null, done);
    qml.interval = 500;
    var now = new Date();
    qml.yield = function(arg) {
      const oe = QmlWeb.engine;
      try {
        QmlWeb.engine = done.engine;
      var t = new Date() - now;
      expect(t).toBeRoughly(500, 0.1);
      done();
      } finally {
        QmlWeb.engine = oe;
      }
    };
    qml.start();
    failTimeout(2000, done);
  });

  it("can set Timer.running = true to start", function(done) {
    var qml = load("Running", this.div, null, done);
    qml.yield = function(succeed) {
      const oe = QmlWeb.engine;
      try {
        QmlWeb.engine = done.engine;
      expect(succeed).toBe(true);
      done();
      } finally {
        QmlWeb.engine = oe;
      }
    };
    qml.start();
    failTimeout(2000, done);
  });

  it("Timer parent property", function() {
    var qml = load("ParentProperty", this.div);
    expect(qml.timer.value).toBe(42);
  });
});
