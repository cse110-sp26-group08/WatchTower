/* eslint-env node */

import {
  createUser,
  deleteUserById,
  editUser,
  getUserById,
} from '../controllers/userController.js';

/**
 * Create a WatchTower user.
 * @route POST /api/users
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function createUserEndpoint(c) {
  try {
    const payload = await c.req.json();
    const user = await createUser(payload);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    return c.json({ user: safeUser }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: message }, 400);
  }
}

/**
 * Fetch a user by id.
 * @route GET /api/users/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function getUserEndpoint(c) {
  const user = await getUserById(c.req.param('id'));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const safeUser = user.toObject();
  delete safeUser.passwordHash;

  return c.json({ user: safeUser }, 200);
}

/**
 * Update a user by id.
 * @route PATCH /api/users/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function updateUserEndpoint(c) {
  try {
    const payload = await c.req.json();
    const user = await editUser(c.req.param('id'), payload);

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return c.json({ error: message }, 400);
  }
}

/**
 * Delete a user by id.
 * @route DELETE /api/users/:id
 * @param {import('hono').Context} c
 * @returns {Promise<Response>}
 */
async function deleteUserEndpoint(c) {
  const user = await deleteUserById(c.req.param('id'));

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const safeUser = user.toObject();
  delete safeUser.passwordHash;

  return c.json({ user: safeUser }, 200);
}

export { createUserEndpoint, deleteUserEndpoint, getUserEndpoint, updateUserEndpoint };
