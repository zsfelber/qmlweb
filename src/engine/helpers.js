class QmlWebHelpers {
  static arrayFindIndex(array, callback) {
    // Note: does not support thisArg, we don't need that
    if (!Array.prototype.findIndex) {
      for (const key in array) {
        if (callback(array[key], key, array)) {
          return key;
        }
      }
      return -1;
    }
    return Array.prototype.findIndex.call(array, callback);
  }
  static mergeObjects(...args) {
    const merged = {};
    for (const i in args) {
      const arg = args[i];
      if (!arg) {
        continue;
      }
      for (const key in arg) {
        merged[key] = arg[key];
      }
    }
    return merged;
  }

  static slice(a, start) {
    return Array.prototype.slice.call(a, start || 0);
  }

  static mergeInPlace() {
    const args = QmlWebHelpers.slice(arguments);
    const merged = args.shift();
    for (const i in args) {
      const arg = args[i];
      if (!arg) {
        continue;
      }
      for (const key in arg) {
        merged[key] = arg[key];
      }
      if (merged instanceof Array) {
        if (!(arg instanceof Array)) {
          throw new Error("Copy from Object to Array");
        }
        if (arg.length > merged.length) {
          merged.length = arg.length;
        }
      }
    }
    return merged;
  }

  static mergeProtoInPlace() {
    const args = QmlWebHelpers.slice(arguments);
    const merged = args.shift();
    for (const i in args) {
      const arg = args[i];
      if (!arg) {
        continue;
      }
      Object.keys(arg).forEach(function(key) {
        merged[key] = arg[key];
      });
      if (merged instanceof Array) {
        if (!(arg instanceof Array)) {
          throw new Error("Copy from Object to Array");
        }
        if (arg.length > merged.length) {
          merged.length = arg.length;
        }
      }
    }
    return merged;
  }


}

QmlWeb.helpers = QmlWebHelpers;
