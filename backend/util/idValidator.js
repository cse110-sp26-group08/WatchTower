/* eslint-env node */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a value is a valid UUID v4.
 * @param {unknown} id
 * @returns {boolean}
 */
function isValidId(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export { isValidId };
