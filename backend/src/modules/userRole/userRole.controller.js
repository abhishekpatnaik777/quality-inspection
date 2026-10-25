import * as userRoleService from './userRole.service.js';

export async function listUserRoles(req, res) {
  const roles = await userRoleService.listUserRoles(req.query);
  res.json(roles);
}

export async function getUserRole(req, res) {
  const role = await userRoleService.getUserRole(req.validatedParams.id);
  res.json(role);
}

export async function createUserRole(req, res) {
  const role = await userRoleService.createUserRole(req.validatedBody);
  res.status(201).json(role);
}

export async function updateUserRole(req, res) {
  const role = await userRoleService.updateUserRole(req.validatedParams.id, req.validatedBody);
  res.json(role);
}

export async function deleteUserRole(req, res) {
  await userRoleService.deleteUserRole(req.validatedParams.id);
  res.status(204).send();
}
