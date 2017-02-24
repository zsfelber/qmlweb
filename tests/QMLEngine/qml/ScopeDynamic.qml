import QtQuick 2.5

Item {

  property int foo: 15

  ScopeDynamicWithFoo {
    id: child

    property int foo: 666//bad if it is found in super !
  }
}
