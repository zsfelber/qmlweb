describe("QMLEngine.properties", function() {
  setupDivElement();
  var load = prefixedQmlLoader("QMLEngine/qml/Properties");

  it("can store values", function() {
    var qml = load("Basic", this.div);
    expect(qml.intProperty).toBe(10);
    expect(qml.doubleProperty).toBe(0.5);
    expect(qml.stringProperty).toBe("hello");
    expect(qml.itemProperty.x).not.toBe(undefined);
    expect(qml.arrayProperty).toEqual([1, 2, "bar"]);
    expect(qml.hexProperty).toEqual(255);
    expect(qml.octProperty).toEqual(63);
    expect(qml.bigNumber).toEqual(100000000);
    expect(qml.sizeProperty.width).toEqual(5);
    expect(qml.sizeProperty.height).toEqual(6);
  });

  it("undefined property has undefined value", function() {
    var qml = load("Undefined", this.div);
    expect(qml.theUndefined).toEqual(undefined);
    expect(typeof qml.theUndefined).toEqual("undefined");
  });

  it("redelclared property name separated from base type", function() {
    var qml = load("Override", this.div);
    expect(qml.prop).toEqual(34567);
    expect(qml.propalias2).toEqual(34567);
    expect(qml.propalias).toEqual(12345);
  });

  it("can be aliased", function() {
    var qml = load("Alias", this.div);
    expect(qml.childX).toBe(125);
  });

  it("alias have changed signal", function() {
    var qml = load("AliasChanged", this.div);
    qml.go();
    expect(qml.childX).toBe(44);
    expect(qml.log).toBe("childX changed to 44!");
    qml.go(); // second call should not call changed signal again
    expect(qml.log).toBe("childX changed to 44!");
  });

  it("alias propagates it's changed signal back to referenced property",
    // NOTE gz modified slightly, this QmlWeb version doesn't connect alias signals but properties only
    function() {
      var qml = load("AliasChangedBack", this.div);
      qml.go();
      expect(qml.thechild.x).toBe(100);
    }
  );

  it("alias to id", function() {
    var qml = load("AliasToId", this.div);
    expect(qml.childA.x).toBe(125);
  });

  it("alias to id with same name", function() {
    var qml = load("AliasToIdSameName", this.div);
    expect(qml.child.x).toBe(125);
  });

  it("alias doesn't see same object aliases", function() {
    var qml = load("AliasHidesProperty", this.div);
    expect(qml.prop).toBe(345678);
    expect(qml.prop2).toBe(12345);
  });


  it("can be named signal", function() {
    load("NamedSignal", this.div);
  });

  it("works when named signal", function() {
    var qml = load("NamedSignalValues", this.div);
    expect(qml.signal).toBe(20);
  });

  /* in Qml, when assigning non-string value to string property,
     is convert's new value to string. */
  it("StringConversion", function() {
    var qml = load("StringConversion", this.div);

    expect(qml.stringA).toBe("10");
    expect(typeof qml.stringA).toBe("string");
    expect(qml.stringB).toBe("11");
    expect(typeof qml.stringB).toBe("string");
    expect(qml.stringBinding).toBe("2");
    expect(typeof qml.stringBinding).toBe("string");
    expect(qml.stringFalseVal).toBe("0");
    expect(typeof qml.stringFalseVal).toBe("string");
    qml.reassign();
    expect(qml.stringA).toBe("333");
    expect(typeof qml.stringA).toBe("string");
  });

  it("ChangedSignal", function() {
    var qml = load("ChangedSignal", this.div);
    //QmlWeb/zsfelber 69->81 indended (+12 = width + height changed initially)
    expect(qml.result).toBe(81);
  });

  it("ChangedExpressionSignal", function() {
    var qml = load("ChangedExpressionSignal", this.div);
    expect(qml.counter).toBe(1);
  });

  it("Url", function() {
    const engine = $$engine;
    var qml = load("Url", this.div);
    expect(qml.localNonBoundSimple).toBe(
      engine.$basePathUrl.baseUri + "PropertiesUrlDir/localNonBoundSimple.png");
    expect(qml.localBinding).toBe(
      engine.$basePathUrl.baseUri + "PropertiesUrlDir/localBinding.png");
    expect(qml.localSet).toBe(
      engine.$basePathUrl.baseUri + "PropertiesUrlDir/localSet.png");
    expect(qml.remoteNonBoundSimple).toBe(
      engine.$basePathUrl.baseUri + "remoteNonBoundSimple.png");
    expect(qml.remoteBinding).toBe(
      engine.$basePathUrl.baseUri + "remoteBinding.png");
    expect(qml.properties_url_import.remoteSet).toBe(engine.$basePathUrl.baseUri + "remoteSet.png");
    expect(qml.remoteSet).toBe(engine.$basePathUrl.baseUri + "remoteSet.png");
    expect(qml.http).toBe("http://http-url");
    /* Get the base address of the URL */
    const a = document.createElement("a");
    a.href = "/";
    expect(qml.absolute).toBe(a.href + "absolute-url");
    expect(qml.unset).toBe("");
    expect(qml.setToEmptyString).toBe("");
  });

  it("Url exception safe", function() {
    const engine = $$engine;
    var qml = load("UrlExceptionSafe", this.div);
    expect(qml.localNonBoundSimple).toBe(
      engine.$basePathUrl.baseUri + "PropertiesUrlDir/localNonBoundSimple.png");
    expect(qml.localBinding).toBe(
      engine.$basePathUrl.baseUri + "PropertiesUrlDir/localBinding.png");
    expect(qml.localSet).toBe(
      engine.$basePathUrl.baseUri + "PropertiesUrlDir/localSet.png");
    expect(qml.remoteNonBoundSimple).toBe(
      engine.$basePathUrl.baseUri + "remoteNonBoundSimple.png");
    expect(qml.remoteBinding).toBe(
      engine.$basePathUrl.baseUri + "remoteBinding.png");
    expect(qml.remoteSet).toBe(engine.$basePathUrl.baseUri + "remoteSet.png");
  });
});
