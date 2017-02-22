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
   * things are done in PropertiesUrl. This tests that running slots in this
   * context doesn't have any unintended consequences. The "return" statements
   * are to ensure that slot handling continues after a return. */
  onRemoteSetChanged: {
      return
  }
  onRemoteNonBoundSimpleChanged: {
      return
  }
  onRemoteBindingChanged: {
      return
  }
}
