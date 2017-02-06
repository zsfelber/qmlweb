const QMLOperationState = {
  Idle: 0,
  Running: 1,
  System: 2,
  Starting: 4,
  Init: 8,
  SystemInit: 10,
  BeforeStart: 12,
  Remote: 16
};

const Component = {
  Null: 1, Ready: 2, Loading: 3, Error: 4
};

QmlWeb.QMLOperationState = QMLOperationState;
QmlWeb.Component = Component;
