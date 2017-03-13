// We need to disable Shadow DOM isolation for tests, as we inspect
// the DOM contents of QML elements through .children

jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

QmlWeb.useShadowDom = false;
QmlWeb.isTesting = true;

var $$engine;
var cleanupList = [];

function loadQmlFile(file, div, opts) {
  if (!$$engine) $$engine = new QmlWeb.QMLEngine(null, {logging:isDebug()?QmlWeb.QMLEngineLogging.Full:QmlWeb.QMLEngineLogging.WarnErr});
  $$engine.setDom(div);
  $$engine.loadFile(file);
  document.body.appendChild(div);
  cleanupList.push($$engine.rootObject);
  return $$engine.rootObject;
}

function prefixedQmlLoader(prefix) {
  return function(file, div, opts) {
    return loadQmlFile("/base/tests/" + prefix + file + ".qml", div, opts);
  };
}

function loadQml(src, div, opts) {
  if (!$$engine) $$engine = new QmlWeb.QMLEngine(null, {logging:isDebug()?QmlWeb.QMLEngineLogging.Full:QmlWeb.QMLEngineLogging.WarnErr});
  $$engine.setDom(div);
  $$engine.loadQML(src);
  document.body.appendChild(div);
  return $$engine.rootObject;
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

    const F = arguments[1];
    const args = QmlWeb.helpers.slice(arguments, 0);
    if (!F) {
      throw new Error("it : Callback function is missing.");
    }

    if (/^function\s*\w*\s*\(\s*done\b/.test(F.toString())) {
      console.log("Async mode : "+name+" : it(done) is used.");
      args[1] = function _fwd(_done) {
        const done = arguments[0];
        if (!done) {
          throw new Error("done() is not defined.");
        }
        console.log("Async : "+name+"  started.");

        var defcleanup = {};
        const args2 = QmlWeb.helpers.slice(arguments, 0);
        args2[0] = function() {
          args2[0].finished = true;
          try {
            console.log("Async finished : "+name);
            done();
          } finally {
            if (defcleanup.engine) defcleanup.engine.stop();
            cleanup(defcleanup.list);
          }
        };

        try {
          F.apply(this, args2);
        } finally {
          defcleanup.list = cleanupList;
          defcleanup.engine = $$engine;
          cleanupList = [];
          $$engine = null;
        }
      };
    } else {
      console.log(name+" : it() is used. (Sync)");
      args[1] = function _fwd() {
        const done = arguments[0];
        if (done) {
          throw new Error("done() is defined.");
        }

        try {
          F.apply(this, arguments);
        } finally {
          if ($$engine) $$engine.stop();
          cleanup();
        }
      };
    }

    itOrig.apply(this, args);
  };

  window.cleanup = function(list) {
    if (!list) list = cleanupList;
    while (list.length) {
      const itm = list.pop();
      console.log("Cleanup : "+itm);
      itm.destroy();
    }
  }

  window.failTimeout = function(millis, done) {
    if (!done) {
      throw new Error("done() is missing.");
    }

    setTimeout(function(){
      if (!done.finished) {
        expect("Async test : Timeout reached : "+millis).toBe(false);
        done();
      }
    }, millis);
  }

}());
