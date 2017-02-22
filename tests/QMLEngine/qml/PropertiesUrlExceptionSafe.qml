import QtQuick 2.0
import "PropertiesUrlDir"

Item {
  property alias localNonBoundSimple: properties_url_import.localNonBoundSimple
  property alias localBinding: properties_url_import.localBinding
  property alias localSet: properties_url_import.localSet
  property alias remoteNonBoundSimple: properties_url_import.remoteNonBoundSimple
  property alias remoteBinding: properties_url_import.remoteBinding
  property alias remoteSet: properties_url_import.remoteSet
  PropertiesUrlImportWithExceptions {
    id: properties_url_import
    remoteNonBoundSimple: "remoteNonBoundSimple.png"
    remoteBinding: "remote"+remoteBindingPng
    remoteBindingPng:"Binding.png"
    Component.onCompleted: {
      properties_url_import.remoteSet = "remoteSet.png"
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
}
