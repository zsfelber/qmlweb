const QMLOperationState = {
  Idle: 0,
  Running: 1,
  System: 2,
  Starting: 4,
  Init: 8,
  SystemInit: 2|8,
  BeforeStart: 4|8,
  Remote: 16,
  Destroyed: 32,

  toString: function(flags) {
    return humanize.call(QMLOperationState, flags);
  }

};

const QMLEngineLogging = {
  Error : 1,
  Warning : 2,
  WarnErr : 3,
  Info : 4,
  Debug : 8,
  Full : 15,

  toString: function(flags) {
    return humanize.call(QMLEngineLogging, flags);
  }
};

const Component = {
  Null: 0, Ready: 1, Loading: 2, Error: 4,

  toString: function(flags) {
    return humanize.call(Component, flags);
  }
};

const QMLComponentFlags = {
  // determine automatically whether Nested or Root (Super is not possible)
  // at every ($)createObject
  Factory : 0,
  Super : 1,
  Nested : 2,
  Root : 4,
  Element : 8,
  LoadImports : 16,
  Flat : 32,
  FirstSuper : 64,
  NestedOrFirst : 66,
  DynamicLoad : 128,
  _FirstDynamic : 256,
  FirstDynamic : 128 | 256,

  Super_mnem : "S",
  Nested_mnem : "N",
  Root_mnem : "R",
  Element_mnem : "e",
  LoadImports_mnem : "i",
  Flat_mnem : "_",
  FirstSuper_mnem : "1st",
  DynamicLoad_mnem : "D",
  _FirstDynamic_mnem : "d1",

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
  ContextNullable : 32,
  ListTemplate : 64,

  toString: function(flags) {
    return humanize.call(QMLBindingFlags, flags);
  }
};

const QMLPropertyFlags = {
  ReasonUser : 0,
  ReasonInit : 1,
  ReasonTemporally : 2,
  Privileged : 4,
  ReasonInitPrivileged : 1 | 4,
  ResetBinding : 8,
  SetChildren : 16,
  ThroughBinding : 32,

  toString: function(flags) {
    return humanize.call(QMLPropertyFlags, flags);
  }
};

const QMLPropertyState = {
  Valid : 0,
  Updating : 1,
  Uninitialized : 2,
  LoadFromBinding : 4,
  ValueSaved : 8,
  Dynamic : 16,
  InvalidityFlags : 2 | 4 | 16,
  Changed : 4 | 8 | 16,
  DirtyRead : 4 | 16,
  DirtyAll : 31,

  Valid_mnem : "ok",
  Updating_mnem : "~",
  Uninitialized_mnem : "-",
  LoadFromBinding_mnem : "!",
  ValueSaved_mnem : ">",
  Dynamic_mnem : "D",

  toString: function(flags, mnem = true) {
    return humanize.call(QMLPropertyState, flags, mnem);
  }
};

const QMLSignalFlags = {
  AutoConnection : 0,
  DirectConnection : 1,
  QueuedConnection : 2,
  ToFirst : 4,
  UniqueConnection : 128,

  AutoConnection_mnem : "A",
  DirectConnection_mnem : "d",
  QueuedConnection_mnem : "q",
  ToFirst_mnem : "1",
  UniqueConnection_mnem : "U",

  toString: function(flags, mnem = true) {
    return humanize.call(QMLSignalFlags, flags, mnem);
  }
}

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
    if (typeof val==="number" && LogTwo[val]!==undefined && (val & flags)) {
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
QmlWeb.QMLEngineLogging = QMLEngineLogging;
QmlWeb.Component = Component;
QmlWeb.QMLComponentFlags = QMLComponentFlags;
QmlWeb.QMLBindingFlags = QMLBindingFlags;
QmlWeb.QMLPropertyFlags = QMLPropertyFlags;
QmlWeb.QMLPropertyState = QMLPropertyState;
QmlWeb.QMLSignalFlags = QMLSignalFlags;
