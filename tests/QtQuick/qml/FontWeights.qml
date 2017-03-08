import QtQuick 2.0

Item {
  property var weights: ["Thin", "ExtraLight", "Light", "Normal", "Medium", "DemiBold", "Bold", "ExtraBold", "Black"]
  property alias repeater: repeater_
  property int i : 0;
  Column {
    Repeater {
      id: repeater_
      model: weights.length
      Text {
        text: weights[index]
        font.weight: eval("Font." + text)
        Component.onCompleted : {
          console.log(++i+": Font." + text+" : "+font.weight+" > "+dom.children[0].style.fontWeight);
        }
      }
    }
  }
}
