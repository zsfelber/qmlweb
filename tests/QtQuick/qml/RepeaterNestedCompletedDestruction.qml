import QtQuick 2.0

Item {
    id: root

    property int internal_created
    property int internal_destroyed

    Repeater {
        id: repeater
        Item {
            Repeater {
                model: 1
                Rectangle {
                    Component.onCompleted: {
                        root.internal_created++
                    }
                    Component.onDestruction: {
                        root.internal_destroyed++
                    }
                }
            }
        }
    }

    Component.onCompleted: {
      console.log(internal_created, internal_destroyed);
        repeater.model = 1
      console.log(internal_created, internal_destroyed);
        repeater.model = 0
      console.log(internal_created, internal_destroyed);
        repeater.model = 2
      console.log(internal_created, internal_destroyed);
        repeater.model = 0
      console.log(internal_created, internal_destroyed);
    }
}
