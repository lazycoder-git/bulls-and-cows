"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { GameBoard } from "@/components/game/GameBoard";
import { generateSecret } from "@traffic/shared";
import type { GameState } from "@traffic/shared";
import { socketService } from "@/lib/socket";
import { api } from "@/lib/api";

// ── Funny tab messages when player switches away during a game ──────────────
const AWAY_MESSAGES = [
  "👀 Your opponent is GUESSING...",
  "🐄 The cows are watching you...",
  "🐂 Come back! Bulls need you!",
  "🚨 YOU'RE MISSING YOUR TURN!",
  "😤 Your code isn't cracking itself",
  "👻 Boo! Focus on the game!",
  "🎯 Your opponent is winning...",
  "🤔 Is this how you lose? Really?",
  "⏰ Tick tock, your turn is waiting",
  "🥺 The numbers miss you...",
];

function useTabFocus(isActiveGame: boolean) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgIndexRef = useRef(0);
  const originalTitleRef = useRef<string>("");

  useEffect(() => {
    if (!isActiveGame) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save original title once
        if (!originalTitleRef.current) {
          originalTitleRef.current = document.title;
        }
        // Rotate funny messages
        intervalRef.current = setInterval(() => {
          document.title = AWAY_MESSAGES[msgIndexRef.current % AWAY_MESSAGES.length];
          msgIndexRef.current += 1;
        }, 1500);
      } else {
        // Player came back — restore title
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        document.title = originalTitleRef.current || "BnC – Bulls & Cows";
        msgIndexRef.current = 0;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Restore title on unmount
      if (originalTitleRef.current) document.title = originalTitleRef.current;
    };
  }, [isActiveGame]);
}

export default function GamePage() {
  const params   = useParams();
  const router   = useRouter();
  const { data: session } = useSession();
  const gameId   = params?.id as string;

  const isSolo   = !gameId || gameId.startsWith("solo-");
  const isLocalSolo = gameId?.startsWith("solo-"); // no DB tracking

  // ── Solo (local) state ────────────────────────────────────────────────────
  const [secret, setSecret]     = useState<string>("");
  const [localKey, setLocalKey] = useState(0);

  // ── Multiplayer state ──────────────────────────────────────────────────────
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading]     = useState(!isSolo);
  const [error, setError]         = useState<string | null>(null);
  const socketSetupRef            = useRef(false);

  // Determine if a live multiplayer game is active (not finished/abandoned)
  const isActiveMultiplayer =
    !isSolo &&
    !!gameState &&
    gameState.status === "active";

  // ── Funny tab title when switching away during active game ────────────────
  useTabFocus(isActiveMultiplayer);

  // ── Local solo: generate secret ───────────────────────────────────────────
  useEffect(() => {
    if (isSolo) {
      setSecret(generateSecret());
    }
  }, [isSolo, localKey]);

  // ── Non-local solo: fetch game state + connect socket ─────────────────────
  useEffect(() => {
    if (isSolo || !gameId) return;

    const backendToken = (session as any)?.backendToken as string | undefined;

    // 1. Fetch initial game state from REST
    api.get<{ game: GameState }>(`/api/games/${gameId}`, backendToken)
      .then((data) => {
        setGameState(data.game);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message ?? "Game not found");
        setLoading(false);
      });

    // 2. Connect socket (if not already)
    if (!socketSetupRef.current) {
      socketSetupRef.current = true;
      const socket = socketService.connect(backendToken);

      socket.on("game:state", (state: GameState) => {
        if (state.id === gameId) setGameState(state);
      });

      socket.on("game:over", ({ winner, secretNumber }) => {
        setGameState((prev) =>
          prev
            ? { ...prev, status: "finished", winner: winner ?? undefined, secretNumber }
            : prev
        );
      });

      socket.on("error", (msg: string) => {
        setError(msg);
      });
    }

    return () => {
      // Keep socket alive (shared instance), just detach listeners
      const socket = socketService.getSocket();
      socket?.off("game:state");
      socket?.off("game:over");
      socket?.off("error");
      socketSetupRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, isSolo]);

  // ── Multiplayer: send guess via socket ─────────────────────────────────────
  const handleGuess = useCallback(
    (guess: string) => {
      const socket = socketService.getSocket();
      if (socket?.connected && gameId) {
        socket.emit("game:guess", { gameId, guess });
      }
    },
    [gameId]
  );

  // ── Local solo restart ─────────────────────────────────────────────────────
  const handleLocalRestart = useCallback(() => {
    setLocalKey((k) => k + 1);
    setSecret(generateSecret());
  }, []);

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        color: "#7a7570", fontSize: 14,
      }}>
        Loading game…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <div style={{ color: "#f87171", fontWeight: 700, fontSize: 16 }}>{error}</div>
        <button
          onClick={() => router.push("/play")}
          style={{
            padding: "10px 24px", borderRadius: 8, background: "#81b64c",
            color: "#1a1a13", fontWeight: 700, border: "none", cursor: "pointer",
          }}
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // ── Local solo ─────────────────────────────────────────────────────────────
  if (isSolo) {
    if (!secret) return null; // wait for secret generation
    return (
      <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
        <GameBoard
          key={localKey}
          secret={secret}
          myPlayerId="local"
          onRestart={handleLocalRestart}
          backHref="/play"
        />
      </div>
    );
  }

  // ── Multiplayer ────────────────────────────────────────────────────────────
  if (!gameState) return null;

  const myPlayerId = (session?.user as any)?.id as string | undefined;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 overflow-hidden">
      <GameBoard
        gameState={gameState}
        myPlayerId={myPlayerId}
        onGuess={handleGuess}
        backHref="/play"
      />
    </div>
  );
}
