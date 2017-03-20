window.failingTests = {
  QMLEngine: {
    scope: [
      // not sure is needed
      "can reference inherited properties from parent (upflow)"
    ]
  },
  QtQuick: {
    Timer: [
      "can roughly set short intervals" // flaky
    ]
  },
  Initialize: {
    QtQuick: [
      "Translate",
      "Scale",
      "Rotation",
      "Font"
    ]
  }
};

