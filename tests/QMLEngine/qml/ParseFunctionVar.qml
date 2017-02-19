import QtQuick 2.0

Item {
  property string checkBindingCtxProp : "mobydick";

  property var aFunction: function() {
    return checkBindingCtxProp;
  }
}
