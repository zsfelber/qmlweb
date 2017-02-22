import QtQuick 2.0

Item {
  property url localNonBoundSimple: "localNonBoundSimple.png"
  property url localBinding: "local" + localBindingPng
  property string localBindingPng : "Binding.png"
  property url localSet
  property url remoteNonBoundSimple
  property url remoteBinding
  property url remoteSet
  property string remoteBindingPng
  Component.onCompleted: {
    localSet = "localSet.png"
  }
  /* These are required as they force some slots to run in this context when
   * things are done in PropertiesUrlExceptionSafe. This tests that running
   * slots that throw an exception in this context doesn't have any unintended
   * consequences. */
  onLocalSetChanged: {
      throw "Some Exception"
  }
  onLocalNonBoundSimpleChanged: {
      throw "Some Exception"
  }
  onLocalBindingChanged: {
      throw "Some Exception"
  }
  onRemoteSetChanged: {
      throw "Some Exception"
  }
  onRemoteNonBoundSimpleChanged: {
      throw "Some Exception"
  }
  onRemoteBindingChanged: {
      throw "Some Exception"
  }
}
