import QtQuick 2.5

ScopeDynamicWithBadFoo {

  id: dynfoo

  Item {
    id: child;

    property string footxt: "found it is : "+foo
  }

}
