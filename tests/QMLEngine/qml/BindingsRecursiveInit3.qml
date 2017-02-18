import QtQuick 2.2

Item {
  width: 400
  property int intA: {
    for (var i=0,s=0; i<nine(); i++) s+=four();
    return s;
  }

  onIntAChanged: launch()

  property var log: ""
  function launch() {
    // perform something expensive and important,
    // where intA value really matters
    log = log + "Fly to planet N" + intA + "!"; 
  }

  function nine() {
    return three()*three();
  }

  function four() {
    return (nine()-three())*2/3;
  }

  function three() {
    return 3;
  }

  Text {
    text: log
  }
}
