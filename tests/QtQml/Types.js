describe("QtQml.Types", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QtQml/qml/Types");
  var Qt = QmlWeb.Qt;

  it("size", function() {
    var e = Qt.size(1, 2);
    expect(e + "").toEqual("QSizeF(1, 2)");
  });

  it("point", function() {
    var e = Qt.point(1, 2);
    expect(e + "").toEqual("QPointF(1, 2)");
  });

  it("rect", function() {
    var e = Qt.rect(1, 2, 3, 4);
    expect(e + "").toEqual("QRectF(1, 2, 3, 4)");
  });

  it("vector2d", function() {
    var e = Qt.vector2d(1, 2);
    expect(e + "").toEqual("QVector2D(1, 2)");
  });

  it("vector3d", function() {
    var e = Qt.vector3d(1, 2, 3);
    expect(e + "").toEqual("QVector3D(1, 2, 3)");
  });

  it("vector4d", function() {
    var e = Qt.vector4d(1, 2, 3, 4);
    expect(e + "").toEqual("QVector4D(1, 2, 3, 4)");
  });

  it("quaternion", function() {
    var e = Qt.quaternion(1, 2, 3, 4);
    expect(e + "").toEqual("QQuaternion(1, 2, 3, 4)");
  });

  it("matrix4x4", function() {
    var e = Qt.matrix4x4(1, 2, 3, 4, 5, 6, 7, 8,
                         1, 2, 3, 4, 5, 6, 7, 8);
    expect(e + "").toEqual("QMatrix4x4(1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6, 7, 8)");
  });

  it("color", function() {
    var qml = load("Color", this.div);
    expect(qml.trueTests[0]).toBe(true);
    expect(qml.trueTests[1]).toBe(true);
    expect(qml.trueTests[2]).toBe(true);
    expect(qml.falseTests[0]).toBe(false);
    expect(qml.falseTests[1]).toBe(false);
    expect(qml.falseTests[2]).toBe(false);
  });
});
