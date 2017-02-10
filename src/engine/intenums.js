const QMLOperationState = {
  Idle: 0,
  Running: 1,
  System: 2,
  Starting: 4,
  Init: 8,
  SystemInit: 10,
  BeforeStart: 12,
  Remote: 16,

  toString: function(flags) {
    return humanize.call(QMLOperationState, flags);
  }

};

const Component = {
  Null: 1, Ready: 2, Loading: 3, Error: 4,

  toString: function(flags) {
    return humanize.call(Component, flags);
  }
};

const QMLComponentFlags = {
  // determine automatically whether Nested or Root (Super is not possible)
  // at every ($)createObject
  LazyOrFactory : 0,
  Super : 1,
  Nested : 2,
  Root : 4,
  Element : 8,
  LoadImports : 16,

  Super_mnem : "S",
  Nested_mnem : "N",
  Root_mnem : "R",
  Element_mnem : "e",
  LoadImports_mnem : "i",

  toString: function(flags, mnem = true) {
    return humanize.call(QMLComponentFlags, flags, mnem);
  }
};

const QMLBindingFlags = {
  ImplExpression : 0,
  ImplBlock : 1,
  ImplFunction : 2,
  Bidirectional : 4,
  _Alias : 8,
  Alias : 12, // always bidirectional
  User : 16,
  OmitContext : 32,
  ListTemplate : 64,

  toString: function(flags) {
    return humanize.call(QMLBindingFlags, flags);
  }
};

const QMLPropertyFlags = {
  ReasonUser : 0,
  ReasonInit : 1,
  ReasonAnimation : 2,
  Privileged : 4,
  RemoveBidirectionalBinding : 8,
  SetChildren : 16,
  ThroughBinding : 32,
  ReasonInitPrivileged : 1 | 4,

  toString: function(flags) {
    return humanize.call(QMLPropertyFlags, flags);
  }
};

const QMLPropertyState = {
  StateValid : 0,
  StateNeedsUpdate : 1,
  StateUpdating : 2,

  StateValid_mnem : "ok",
  StateNeedsUpdate_mnem : "U",
  StateUpdating_mnem : "~",

  toString: function(flags, mnem = true) {
    return humanize.call(QMLPropertyState, flags, mnem);
  }
};


const LogTwo = {
};
for (let i=0,p2=1; i<32; i++,p2<<=1) {
  LogTwo[p2]=i;
}

// this : enum
function humanize(flags, mnems) {
  var f = [];
  for (var field in this) {
    var val = this[field];
    if (LogTwo[val]!==undefined && (val & flags)) {
      if (mnems) {
        var mnem = this[field+"_mnem"];
        f.push(mnem);
      } else {
        f.push(field);
      }
    }
  }
  if (mnems) {
    f = f.join("");
  } else {
    f = f.join("|");
  }
  return f;
}

QmlWeb.QMLOperationState = QMLOperationState;
QmlWeb.Component = Component;
QmlWeb.QMLComponentFlags = QMLComponentFlags;
QmlWeb.QMLBindingFlags = QMLBindingFlags;
QmlWeb.QMLPropertyFlags = QMLPropertyFlags;
QmlWeb.QMLPropertyState = QMLPropertyState;
