window.failingTests = {
  Render: {
    Async: [
      // "NumberAnimationAutorun"
    ]
  },
  QMLEngine: {
    basic: [
      // "SignalDisconnect"
    ],
    bindings: [
      // "RecursiveInit3"
    ],
    properties: [
      // "alias to id with same name",
      // "ChangedExpressionSignal"
    ],
    scope: [
      // "object id should override same-named property of base object",
      // not sure is needed
      "can reference inherited properties from parent (upflow)"
    ]
  },
  QtQml: {
    Binding: [
      // "binding undefined var"
    ]
  },
  QtQuick: {
    Timer: [
      "can roughly set short intervals" // flaky
    ],
    Repeater: [
      // "handle delegate property and role name conflict"
    ]
  },
  Initialize: {
    QtQuick: [
      // "Translate",
      // "Scale",
      // "Rotation",
      // "Font"
    ]
  }
};

