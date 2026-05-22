/* eslint-env node */

/**
 * Add a .toObject() shim to a plain DB result object so endpoint code that
 * calls .toObject() keeps working without modification.
 * @template T
 * @param {T} obj
 * @returns {T & { toObject: () => T } | null}
 */
function withToObject(obj) {
  if (!obj) return obj;
  return { ...obj, toObject: () => ({ ...obj }) };
}

/**
 * @template T
 * @param {T[]} arr
 * @returns {Array<T & { toObject: () => T }>}
 */
function withToObjectArray(arr) {
  return arr.map(withToObject);
}

export { withToObject, withToObjectArray };
