import QtQuick 2.0

Flow {
  width: 23
  height: 17
  Repeater {
    model: 11
    delegate: Rectangle {
      color: index % 3 ? '#ccc' : '#000'
      width: 5
      height: 5
      Component.onCompleted: {
        console.log(txt());
      }
      function txt() {
        return (index+":"+x+","+y+":"+color);
      }
    }
  }
  onChildrenChanged: {
    console.log("onChildrenChanged");
    for (var i in children) {
      var c = children[i];
      if (c.txt) {
        console.log(c.txt());
      } else {
        console.log(i+". ??"+c.toString(true));
      }
    }
  }
}
