import QtQuick 2.5

Item {
  id: badfoo

  property string footxt: "not found : "+(typeof foo!=="undefined"?"oops:"+foo:undefined)
}
