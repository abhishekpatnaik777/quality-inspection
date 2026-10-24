import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import {
  isPrismaKnownError,
  serializeUser,
  serializeUserSupervisor,
  userListInclude,
} from '../db/serializers.js';
import { validateCreateUser, validateUpdateUser, validateUserId } from '../lib/users.js';

const router = Router();

router.get('/', async (req, res) => {
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const roleFilter = typeof req.query.role === 'string' ? req.query.role.trim() : '';

  try {
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (roleFilter) {
      where.roles = {
        some: {
          role: roleFilter,
          status: 'active',
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      include: userListInclude,
      orderBy: { id: 'asc' },
    });

    res.json(users.map(serializeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/:id', async (req, res) => {
  const id = validateUserId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: id.value },
      include: userListInclude,
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(serializeUser(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/', async (req, res) => {
  const parsed = validateCreateUser(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { name, email, role, supervisor_id, created_by, updated_by } = parsed.value;

  try {
    if (role === 'quality_engineer') {
      const supervisor = await prisma.user.findFirst({
        where: {
          id: supervisor_id,
          status: 'active',
          roles: {
            some: {
              role: 'supervisor',
              status: 'active',
            },
          },
        },
      });
      if (!supervisor) {
        return res.status(400).json({ error: 'supervisor_id must be an active supervisor' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          status: 'active',
          createdBy: created_by,
          updatedBy: updated_by,
          roles: {
            create: {
              role,
              status: 'active',
              createdBy: created_by,
              updatedBy: updated_by,
            },
          },
          ...(role === 'quality_engineer'
            ? {
                qualityEngineerLink: {
                  create: {
                    supervisorId: supervisor_id,
                    status: 'active',
                    createdBy: created_by,
                    updatedBy: updated_by,
                  },
                },
              }
            : {}),
        },
        include: {
          roles: true,
          qualityEngineerLink: true,
        },
      });

      return user;
    });

    const userRole = result.roles[0] ?? null;

    res.status(201).json({
      ...serializeUser({
        ...result,
        qualityEngineerLink: null,
      }),
      roles: [role],
      user_role: userRole
        ? {
            id: userRole.id,
            user_id: userRole.userId,
            role: userRole.role,
            status: userRole.status,
            created_at: userRole.createdAt,
            created_by: userRole.createdBy,
            updated_at: userRole.updatedAt,
            updated_by: userRole.updatedBy,
          }
        : null,
      user_supervisor: serializeUserSupervisor(result.qualityEngineerLink),
    });
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2002')) {
      return res.status(409).json({ error: 'email already exists' });
    }
    if (isPrismaKnownError(err, 'P2003')) {
      return res
        .status(400)
        .json({ error: 'created_by, updated_by, or supervisor does not exist' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.patch('/:id', async (req, res) => {
  const id = validateUserId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  const parsed = validateUpdateUser(req.body);
  if (!parsed.ok) {
    return res.status(parsed.statusCode).json({ error: parsed.error });
  }

  const { name, email, status, updated_by } = parsed.value;
  const data = {};
  if (name !== null) data.name = name;
  if (email !== null) data.email = email;
  if (status !== null) data.status = status;
  if (updated_by !== null) data.updatedBy = updated_by;

  try {
    const user = await prisma.user.update({
      where: { id: id.value },
      data,
      include: userListInclude,
    });
    res.json(serializeUser(user));
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2025')) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (isPrismaKnownError(err, 'P2002')) {
      return res.status(409).json({ error: 'email already exists' });
    }
    if (isPrismaKnownError(err, 'P2003')) {
      return res.status(400).json({ error: 'updated_by user does not exist' });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = validateUserId(req.params.id);
  if (!id.ok) {
    return res.status(id.statusCode).json({ error: id.error });
  }

  try {
    await prisma.user.delete({ where: { id: id.value } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    if (isPrismaKnownError(err, 'P2025')) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
