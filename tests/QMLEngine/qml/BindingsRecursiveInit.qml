import QtQuick 2.2

Item {
  width: 400
  property int intA: 10 / intB
  property int intB: 1+1

  onIntAChanged: launch()

  property var log: ""
  function launch() {
    // perform something expensive and important,
    // where intA value really matters
    log = log + "Fly to planet N" + intA + "!"; 
  }

  Text {
    text: log
  }
}
