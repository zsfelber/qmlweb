import QtQuick 2.0

Item {
  property color foo: "#abcDEF"
  property color bar: "#abcdef"

  property var trueTests: [
    foo === bar,
    foo == bar,
    foo == "#ffabcdef"
  ]
  property var falseTests: [
    foo === "#ffabcDEF",
    foo == "#ffabcDEF",
    foo === "#ffabcdef"
  ]
}
