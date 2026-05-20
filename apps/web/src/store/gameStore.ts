import { create } from 'zustand';

interface GameState {
  roomId: string | null;
  opponent: any | null;
  status: 'idle' | 'searching' | 'playing' | 'finished';
  turn: 'player' | 'opponent';
  setRoom: (roomId: string) => void;
  setStatus: (status: GameState['status']) => void;
}

export const useGameStore = create<GameState>((set) => ({
  roomId: null,
  opponent: null,
  status: 'idle',
  turn: 'player',
  setRoom: (roomId) => set({ roomId }),
  setStatus: (status) => set({ status }),
}));
