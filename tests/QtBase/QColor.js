describe("QtBase.QColor", function() {
  it("present", function() {
    expect(!!QmlWeb && !!QmlWeb.QColor).toBe(true);
  });

  it("construction", function() {
    var colors = [
      "#abcDEF",
      "#abcdef",
      0xabcdef
    ];
    var i = 0;
    colors.forEach(function(input) {
      var color = new QmlWeb.QColor(input);
      expect(i+". "+color.toString()).toBe(i+". #ffabcdef");
      ++i;
    });
  });

  it("comparison", function() {
    var color = new QmlWeb.QColor("#abcDEF");
    expect(color.toString()).toBe("#ffabcdef");
    // eslint-disable-next-line eqeqeq
    expect(color == "#ffabcdef").toBe(true);
    // eslint-disable-next-line eqeqeq
    expect(color == "#ffabcDEF").toBe(false);
    expect(color === "#ffabcdef").toBe(false);
  });
});
