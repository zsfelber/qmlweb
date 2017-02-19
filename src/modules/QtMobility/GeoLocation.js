QmlWeb.registerQmlType({
  module: "QtMobility",
  name: "GeoLocation",
  versions: /.*/,
  baseClass: "QtQuick.Item",
  properties: {
    accuracy: "double",
    altitude: "double",
    altitudeAccuracy: "double",
    heading: "double",
    latitude: "double",
    longitude: "double",
    speed: "double",
    timestamp: "date",
    label: "string"
  }
}, class GeoLocation extends Item {
  constructor(meta) {
    super(meta);
    QmlWeb.initMeta(this, meta);

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(pos => this.$updatePosition(pos));
    navigator.geolocation.watchPosition(pos => this.$updatePosition(pos));
  }
  $updatePosition(position) {
    this.accuracy = position.coords.accuracy;
    this.altitude = position.coords.altitude;
    this.altitudeAccuracy = position.coords.altitudeAccuracy;
    this.heading = position.coords.heading;
    this.latitude = position.coords.latitude;
    this.longitude = position.coords.longitude;
    this.speed = position.coords.speed;
    this.timestamp = position.timestamp;
  }
});
