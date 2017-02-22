import QtQuick 2.0
import QtQuick.Controls 1.1

Item {
  property alias thechild: child
  property alias childData: child.somedata
  property var _somedata: [0,0]

  Rectangle {
    id: child
    x: somedata[0]
    y: somedata[1]
    property var somedata: _somedata

    color: "red"; width: 64; height: 64
  }

  function go() {
    childData[0] = 100;
    _somedataChanged();
  }

  Column {
    Button {
      text: "go!"
      onClicked: go();
    }
  }
}
