import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { isPrismaKnownError, serializeUserRole } from '../db/serializers.js';
import {
  validateCreateUserRole,
  validateUpdateUserRole,
  validateUserRoleId,
} from '../lib/userRoles.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const roles = await prisma.userRole.findMany({
      include: { user: true },
      orderBy: { id: 'asc' },
    });
    res.json(roles.map(serializeUserRole));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

router.get('/:id', async (req, res) => {
  const id = validateUserRoleId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  try {
    const role = await prisma.userRole.findUnique({
      where: { id: id.value },
      include: { user: true },
    });
    if (!role) {
      return res.status(404).json({ error: 'User role not found' });
    }
    res.json(serializeUserRole(role));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user role' });
  }
});

router.post('/', async (req, res) => {
  const parsed = validateCreateUserRole(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { user_id, role, status, created_by, updated_by } = parsed.value;

  try {
    const created = await prisma.userRole.create({
      data: {
        userId: user_id,
        role,
        status,
        createdBy: created_by,
        updatedBy: updated_by,
      },
    });
    res.status(201).json(serializeUserRole(created));
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2003')) {
      return res.status(400).json({ error: 'user_id, created_by, or updated_by does not exist' });
    }
    if (isPrismaKnownError(err, 'P2002')) {
      return res.status(409).json({ error: 'user already has this role' });
    }
    res.status(500).json({ error: 'Failed to create user role' });
  }
});

router.patch('/:id', async (req, res) => {
  const id = validateUserRoleId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  const parsed = validateUpdateUserRole(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { role, status, updated_by } = parsed.value;
  const data = {};
  if (role !== null) data.role = role;
  if (status !== null) data.status = status;
  if (updated_by !== null) data.updatedBy = updated_by;

  try {
    const updated = await prisma.userRole.update({
      where: { id: id.value },
      data,
    });
    res.json(serializeUserRole(updated));
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2025')) {
      return res.status(404).json({ error: 'User role not found' });
    }
    if (isPrismaKnownError(err, 'P2002')) {
      return res.status(409).json({ error: 'user already has this role' });
    }
    if (isPrismaKnownError(err, 'P2003')) {
      return res.status(400).json({ error: 'updated_by user does not exist' });
    }
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = validateUserRoleId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  try {
    await prisma.userRole.delete({ where: { id: id.value } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2025')) {
      return res.status(404).json({ error: 'User role not found' });
    }
    res.status(500).json({ error: 'Failed to delete user role' });
  }
});

export default router;
