describe("Initialize.loadQml", function() {
  setupDivElement();

  it("it can load qml without a file", function() {
    loadQml("import QtQuick 2.0\nItem {}\n", this.div);
  });
});

var modules = {
  "QtQuick 2.5": {
    AnimatedImage: { dom: "" },
    Animation: {},
    Behavior: {},
    BorderImage: {},
    Canvas: { dom: "" },
    Column: { dom: "" },
    DoubleValidator: {},
    Flow: {},
    Font: {},
    FontLoader: {},
    Grid: { dom: "" },
    Image: { dom: "" },
    IntValidator: {},
    ListElement: {},
    ListModel: {},
    ListView: { dom: "" },
    Loader: {},
    MouseArea: { dom: "" },
    NumberAnimation: {},
    ParallelAnimation: {},
    PropertyAnimation: {},
    Rectangle: { dom: "" },
    RegExpValidator: {},
    Repeater: { dom: "" },
    Rotation: {},
    Row: { dom: "" },
    Scale: {},
    SequentialAnimation: {},
    State: {},
    SystemPalette: {},
    Text: { dom: "" },
    TextEdit: { dom: "" },
    TextInput: { dom: "" },
    Timer: {},
    Transition: {},
    Translate: {}
  },
  "QtQml.Models 2.2": {
    ListElement: {},
    ListModel: {}
  },
  "QtQuick.Controls 1.4": {
    ApplicationWindow: { dom: "" },
    Button: { dom: "" },
    CheckBox: { dom: "" },
    ComboBox: { dom: "" },
    ScrollView: { dom: "" },
    TextArea: { dom: "" },
    TextField: { dom: "" }
  },
  "QtQuick.Controls 2": {
    ApplicationWindow: { dom: "" }
  },
  "QtGraphicalEffects 1.0": {
    FastBlur: { dom: "" }
  },
  "QtMobility 1.2": {
  },
  "QtMultimedia 5.0": {
    // X.0 imports should work
    Video: { dom: "" }
  },
  "QtMultimedia 5.6": {
    Audio: {},
    Camera: {},
    MediaPlayer: {},
    VideoOutput: { dom: "" },
    Video: { dom: "" }
  },
  "QtNfc 5.2": {
    NearField: {}
  },
  "QtWebEngine 5.7": {
    WebEngineView: { dom: "" }
  },
  "QtWebView 1.1": {
    WebView: { dom: "" }
  },
  "QtBluetooth 5.2": {
    BluetoothDiscoveryModel: {}
  },
  "QtWebSockets 1.0": {
    WebSocket: {}
  },
  "Qt.labs.settings 1.0": {
    Settings: {}
  },
  "QmlWeb 1.0": {
    RestModel: {}
  },
  "QmlWeb.Dom 1.0": {
    DomElement: { dom: "" }
  }
};

function testModule(module, element, imports, options) {
  describe("Initialize." + module, function() {
    setupDivElement();

    it(element, function() {
      var src = imports + element + " { }\n";
      var qml = loadQml(src, this.div);
      if (options.dom!==undefined) {
        var div = this.div.children[0];
        expect(div.className).toBe(options.dom);
        expect(div.style.boxSizing).toBe("");
      }
      expect(qml.Component).not.toBe(undefined);
    });
  });
}

Object.keys(modules).forEach(function(key) {
  //console.log("Module : "+key);
  var module = modules[key];
  if (module._version) {
    module._name = key;
  } else {
    var split = key.split(" ");
    module._name = split[0];
    module._version = split[1];
  }
  var imports = "import " + module._name + " " + module._version + "\n";
  var deps = module._depends || [];
  for (var i in deps) {
    imports += "import " + deps[i] + "\n";
  }
  Object.keys(module).forEach(function(element) {
    if (element[0] === "_") return;
    //console.log("element : "+element);
    testModule(module._name, element, imports, module[element]);
  });
});
