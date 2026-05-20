import { z } from 'zod';

export const GuessSchema = z.object({
  gameId: z.string(),
  guess: z.string().length(4).regex(/^\d+$/, 'Guess must be 4 digits'),
});

export const CreateRoomSchema = z.object({
  isRated: z.boolean().default(false),
  maxPlayers: z.number().int().min(2).max(2).default(2),
});

export const UpdateProfileSchema = z.object({
  username: z.string().min(3).max(20).optional(),
  avatar: z.string().optional(),
});
