class PendingEvaluation extends Error {
  constructor(...args) {
    super(...args);
    this.property = args[1];
    this.ctType = "PendingEvaluation";
  }
}

class UninitializedEvaluation extends Error {
  constructor(...args) {
    super(...args);
    this.property = args[1];
    this.ctType = "UninitializedEvaluation";
  }
}

class FatalError extends Error {
  constructor(...args) {
    super(...args);
  }
}

class AssertionError extends FatalError {
  constructor(...args) {
    super(...args);
  }
}

function dumpEvalError(msg, err) {
  if (!err.ctType) {
    QmlWeb.warn(msg);
  }
}


QmlWeb.PendingEvaluation = PendingEvaluation;
QmlWeb.UninitializedEvaluation = UninitializedEvaluation;
QmlWeb.dumpEvalError = dumpEvalError;
QmlWeb.FatalError = FatalError;
QmlWeb.AssertionError = AssertionError;
