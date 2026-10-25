import * as userService from './user.service.js';

export async function listUsers(req, res) {
  const users = await userService.listUsers(req.query);
  res.json(users);
}

export async function createUser(req, res) {
  const user = await userService.createUser(req.validatedBody);
  res.status(201).json(user);
}
