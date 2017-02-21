import QtQuick 2.2

Item {
  id: item;

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

  property var four : txt.four;

  function nine() {
    return three()*three();
  }

  function three() {
    return 3;
  }

  Text {
    id: txt
    text: log

    function four() {
      return (item.nine()-item.three())*2/3;
    }
  }

  Component.onCompleted: {
    launch();
  }
}
