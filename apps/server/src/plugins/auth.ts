import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Extend Fastify types for JWT
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string; username: string; email: string };
    user: { id: string; username: string; email: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

export function buildAuthPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', authenticate);
}
