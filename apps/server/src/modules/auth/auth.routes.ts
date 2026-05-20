import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../../utils/prisma.js';
import { validateUsername, validatePassword } from '@traffic/shared';

export const authRoutes: FastifyPluginAsync = async (server) => {
  // ── Exchange NextAuth userId for a Fastify JWT ────────────────────────────
  // Receives a userId derived from Google OAuth (via Next.js)
  // Maps it to a local JSONWebToken that the Socket Server and API can use
  // natively without re-hitting Google.
  server.post('/token', async (request, reply) => {
    const { userId } = request.body as { userId?: string };

    if (!userId) {
      return reply.code(400).send({ error: 'userId is required' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.code(404).send({ error: 'User not found in system' });
    }

    const token = server.jwt.sign(
      {
        id: user.id,
        email: user.email ?? '',
        username: user.username ?? user.name ?? 'Player',
      },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return reply.send({ token });
  });

  // ── Credentials Registration ──────────────────────────────────────────────
  server.post('/register', async (request, reply) => {
    const { username, email, password } = request.body as {
      username?: string;
      email?: string;
      password?: string;
    };

    if (!username || !email || !password) {
      return reply.code(400).send({ error: 'Username, email, and password are required' });
    }

    // 1. Client-side rules validation (on server side)
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.isValid) {
      return reply.code(400).send({ error: usernameValidation.message });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return reply.code(400).send({ error: passwordValidation.message });
    }

    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.code(400).send({ error: 'Invalid email address' });
    }

    const normalisedEmail = email.toLowerCase().trim();
    const normalisedUsername = username.trim(); // Keep original casing or format, but we'll store user's desired name

    // 2. Uniqueness check
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalisedEmail },
          { username: { equals: normalisedUsername, mode: 'insensitive' } }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username?.toLowerCase() === normalisedUsername.toLowerCase()) {
        return reply.code(409).send({ error: 'Username already exists' });
      }
      return reply.code(409).send({ error: 'Email already exists' });
    }

    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Create user
    const newUser = await prisma.user.create({
      data: {
        username: normalisedUsername,
        email: normalisedEmail,
        passwordHash,
        name: username,
        rating: 1200,
      },
      select: {
        id: true,
        username: true,
        email: true,
        rating: true,
      }
    });

    return reply.code(201).send({ user: newUser });
  });

  // ── Credentials Login ──────────────────────────────────────────────────────
  server.post('/login', async (request, reply) => {
    const { usernameOrEmail, password } = request.body as {
      usernameOrEmail?: string;
      password?: string;
    };

    if (!usernameOrEmail || !password) {
      return reply.code(400).send({ error: 'Username/email and password are required' });
    }

    const target = usernameOrEmail.toLowerCase().trim();

    // Find user by either username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: target },
          { username: { equals: target, mode: 'insensitive' } }
        ]
      }
    });

    if (!user || !user.passwordHash) {
      return reply.code(401).send({ error: 'Invalid username/email or password' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return reply.code(401).send({ error: 'Invalid username/email or password' });
    }

    return reply.send({
      id: user.id,
      username: user.username,
      email: user.email,
      rating: user.rating,
    });
  });

  // ── Set a username for a newly signed-in user ─────────────────────────────
  // Called from /auth/username page right after first Google sign-in.
  // Requires the backend JWT (stored on session.backendToken).
  server.post(
    '/username',
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { username } = request.body as { username?: string };
      const userId = (request.user as any).id;

      if (!username || typeof username !== 'string') {
        return reply.code(400).send({ error: 'username is required' });
      }

      const trimmed = username.trim();

      // Enforce validation rules on server side
      const usernameValidation = validateUsername(trimmed);
      if (!usernameValidation.isValid) {
        return reply.code(400).send({ error: usernameValidation.message });
      }

      // Uniqueness check
      const existing = await prisma.user.findFirst({
        where: {
          username: { equals: trimmed, mode: 'insensitive' },
          NOT: { id: userId }
        },
      });
      if (existing) {
        return reply.code(409).send({ error: 'Username already taken' });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { username: trimmed },
        select: { id: true, username: true, email: true, rating: true },
      });

      return reply.send({ user: updated });
    }
  );
};

