import * as userService from './user.service.js';

export async function listUsers(req, res) {
  const users = await userService.listUsers(req.query);
  res.json(users);
}

export async function getUser(req, res) {
  const user = await userService.getUser(req.validatedParams.id);
  res.json(user);
}

export async function createUser(req, res) {
  const user = await userService.createUser(req.validatedBody);
  res.status(201).json(user);
}

export async function updateUser(req, res) {
  const user = await userService.updateUser(req.validatedParams.id, req.validatedBody);
  res.json(user);
}

export async function deleteUser(req, res) {
  await userService.deleteUser(req.validatedParams.id);
  res.status(204).send();
}
