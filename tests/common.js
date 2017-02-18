// We need to disable Shadow DOM isolation for tests, as we inspect
// the DOM contents of QML elements through .children
QmlWeb.useShadowDom = false;

var engine = new QmlWeb.QMLEngine(null, {logging:isDebug()?QmlWeb.QMLEngineLogging.Full:QmlWeb.QMLEngineLogging.WarnErr});

function loadQmlFile(file, div, opts) {
  //var engine = new QmlWeb.QMLEngine(div, opts || {logging:isDebug()?QmlWeb.QMLEngineLogging.Full:QmlWeb.QMLEngineLogging.WarnErr});
  engine.setDom(div);
  engine.loadFile(file);
  engine.start();
  engine.stop();
  document.body.appendChild(div);
  return engine.rootObject;
}

function prefixedQmlLoader(prefix) {
  return function(file, div, opts) {
    return loadQmlFile("/base/tests/" + prefix + file + ".qml", div, opts);
  };
}

function loadQml(src, div, opts) {
  //var engine = new QmlWeb.QMLEngine(div, opts || {logging:isDebug()?QmlWeb.QMLEngineLogging.Full:QmlWeb.QMLEngineLogging.WarnErr});
  engine.setDom(div);
  engine.loadQML(src);
  engine.start();
  engine.stop();
  document.body.appendChild(div);
  return engine.rootObject;
}

function setupDivElement() {
  beforeEach(function() {
    this.div = document.createElement("div");
  });
  afterEach(function() {
    this.div.remove();
  });
}

function sendEvent(element, type, x, y, button) {
  var event = document.createEvent("MouseEvents");
  event.initMouseEvent(type, true, true, window, 0, 0, 0, x || 0, y || 0,
                        false, false, false, false, button || 0, null);
  /*
  var event = new MouseEvent(type, {
    bubbles: true, cancelable: true,
    clientX: x, clientY: y,
    button: button
  });
  */
  var node = element || document.body;
  node.dispatchEvent(event);
}

var customMatchers = {
  toBeRoughly: function(util, customEqualityTesters) {
    return {
      compare: function(actual, expected, diff) {
        var result = {
          pass: actual > expected * (1 - diff) &&
                actual < expected * (1 + diff)
        };
        if (result.pass) {
          result.message = actual + " is roughly equal to " + expected;
        } else {
          result.message = "Expected " + actual + " to be roughly " + expected;
        }
        return result;
      }
    };
  }
};

(function() {
  var describeOrig = describe;
  var itOrig = it;
  var current = "";

  function isFailing(name) {
    var data = window.failingTests;
    current.split(".").forEach(function(part) {
      data = data[part] || {};
    });
    return Array.isArray(data) && data.indexOf(name) !== -1;
  }

  window.describe = function(name) {
    current = name;
    describeOrig.apply(this, arguments);
  };

  window.it = function(name) {
    if (isFailing(name)) {
      console.log("Test " + current + "." + name +
                  " is known to be failing. Skipping...");
      return;
    }
    itOrig.apply(this, arguments);
  };
}());
