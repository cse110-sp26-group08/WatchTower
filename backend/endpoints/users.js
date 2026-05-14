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
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function createUserEndpoint(req, res) {
  try {
    const payload = req.fields || req.body;
    const user = await createUser(payload);
    const safeUser = user.toObject();
    delete safeUser.passwordHash;

    res.status(201).json({ user: safeUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ error: message });
  }
}

/**
 * Fetch a user by id.
 * @route GET /api/users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function getUserEndpoint(req, res) {
  const user = await getUserById(req.params.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const safeUser = user.toObject();
  delete safeUser.passwordHash;

  res.status(200).json({ user: safeUser });
}

/**
 * Update a user by id.
 * @route PATCH /api/users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function updateUserEndpoint(req, res) {
  try {
    const payload = req.fields || req.body;
    const user = await editUser(req.params.id, payload);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(400).json({ error: message });
  }
}

/**
 * Delete a user by id.
 * @route DELETE /api/users/:id
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
async function deleteUserEndpoint(req, res) {
  const user = await deleteUserById(req.params.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const safeUser = user.toObject();
  delete safeUser.passwordHash;

  res.status(200).json({ user: safeUser });
}

export { createUserEndpoint, deleteUserEndpoint, getUserEndpoint, updateUserEndpoint };
