import QtQuick 2.5

Item {

  property int foo: 15// should be found in child.super
  //                     bad if it is found in child.super.super !

  ScopeDynamicWithFoo {
    id: child

    property int foo: 227//bad if it is found in child.super !
  }
}
