describe("QMLEngine.qrc", function() {
  it("present", function() {
    expect(!!QmlWeb && QmlWeb.qrc !== undefined).toBe(true);
  });

  setupDivElement();

  /* Put some stuff into QmlWeb.qrc, this is what gulp-qmlweb does */
  var qrc_files = [
    ["qrc:/Basic.qml",
      "import QtQuick 2.0\n Item { property int value: 42 }"
    ],
    ["qrc:/SomeDir/SomeFile.qml",
      "import QtQuick 2.0\n Item { property int value: 43 }"
    ],
    ["qrc:/QMLImportRelative.qml",
      'import QtQuick 2.0\n import "SomeDir"\n SomeFile { }'
    ],
    ["qrc:/QMLImportRelativeQualified.qml",
      'import QtQuick 2.0\n import "SomeDir" as SomeDir\n SomeDir.SomeFile { }'
    ],
    ["qrc:/SomeDir/QMLImportRelativeDots.qml",
      'import QtQuick 2.0\n import "../SomeDir/../SomeDir/./"\n SomeFile { }'
    ],
    ["qrc:/SomeDir/QMLImportRelativeDotsQualified.qml",
      'import QtQuick 2.0\n import "../SomeDir/../SomeDir/./" as SomeDir\n' +
      "SomeDir.SomeFile { }"
    ],
    ["qrc:/QMLImportAbsolute.qml",
      'import QtQuick 2.0\n import "/SomeDir"\n SomeFile { }'
    ],
    ["qrc:/QMLImportAbsoluteQualified.qml",
      'import QtQuick 2.0\n import "/SomeDir" as SomeDir\n SomeDir.SomeFile { }'
    ],
    ["qrc:/SomeDir/QMLImportLocal.qml",
      "import QtQuick 2.0\n SomeFile { }"
    ],
    ["qrc:/JavaScriptImport.qml",
      'import QtQuick 2.0\n import "JavaScript.js" as JSModule\n' +
      "Item { property int value: JSModule.value }"
    ],
    ["qrc:/JavaScript.js",
      "var value = 44;"
    ],
    ["qrc:/LoaderRelative.qml",
      'import QtQuick 2.0\n Loader { source: "SomeDir/SomeFile.qml" }'
    ],
    ["qrc:/LoaderAbsolute.qml",
      'import QtQuick 2.0\n Loader { source: "/SomeDir/SomeFile.qml" }'
    ],
    ["qrc:/SomeDir/LoaderRelativeDots.qml",
      'import QtQuick 2.0\n Loader { source: "../SomeDir/./SomeFile.qml" }'
    ]
  ];

  QmlWeb.loadParser();

  for (var i in qrc_files) {
    const path = qrc_files[i][0];
    const str = qrc_files[i][1];

    var data;
    if (path.match(/\.qml$/) !== null) {
      data = QmlWeb.parseQML(str, path);
    } else if (path.match(/\.js$/) !== null) {
      data = QmlWeb.jsparse(str);
    } else {
      data = str;
    }

    QmlWeb.addQrc(path, data);
  }

  it("basic", function() {
    var qml = loadQmlFile("qrc:/Basic.qml", this.div);
    expect(qml.value).toBe(42);
  });

  it("QML import relative", function() {
    var qml = loadQmlFile("qrc:/QMLImportRelative.qml", this.div);
    expect(qml.value).toBe(43);
  });

  it("QML import relative qualified", function() {
    var qml = loadQmlFile("qrc:/QMLImportRelativeQualified.qml", this.div);
    expect(qml.value).toBe(43);
  });

  it("QML import relative dots", function() {
    var qml = loadQmlFile("qrc:/SomeDir/QMLImportRelativeDots.qml", this.div);
    expect(qml.value).toBe(43);
  });

  it("QML import relative dots qualified", function() {
    var qml = loadQmlFile("qrc:/SomeDir/QMLImportRelativeDotsQualified.qml",
      this.div);
    expect(qml.value).toBe(43);
  });

  it("QML import absolute", function() {
    var qml = loadQmlFile("qrc:/QMLImportAbsolute.qml", this.div);
    expect(qml.value).toBe(43);
  });

  it("QML import absolute qualified", function() {
    var qml = loadQmlFile("qrc:/QMLImportAbsoluteQualified.qml", this.div);
    expect(qml.value).toBe(43);
  });

  it("QML import local", function() {
    var qml = loadQmlFile("qrc:/SomeDir/QMLImportLocal.qml", this.div);
    expect(qml.value).toBe(43);
  });

  it("JavaScript import", function() {
    var qml = loadQmlFile("qrc:/JavaScriptImport.qml", this.div);
    expect(qml.value).toBe(44);
  });

  it("Loader relative", function() {
    var qml = loadQmlFile("qrc:/LoaderRelative.qml", this.div);
    expect(qml.item.value).toBe(43);
  });

  it("Loader absolute", function() {
    var qml = loadQmlFile("qrc:/LoaderAbsolute.qml", this.div);
    expect(qml.item.value).toBe(43);
  });

  it("Loader relative dots", function() {
    var qml = loadQmlFile("qrc:/SomeDir/LoaderRelativeDots.qml", this.div);
    expect(qml.item.value).toBe(43);
  });
});
