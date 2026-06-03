import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Cell = { x: number; y: number };
type Difficulty = "easy" | "medium" | "hard";

const COLS = 15;
const ROWS = 11;
const CELL_DESKTOP = 40;

// 1 = wall, 0 = floor. Classroom-ish layout with desks as walls.
const LAYOUT: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,0,1,1,0,0,0,1,1,0,1,1,0],
  [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],
  [0,1,0,1,1,0,0,0,0,0,1,1,0,1,0],
  [0,1,0,0,0,0,1,1,1,0,0,0,0,1,0],
  [0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],
  [0,1,0,1,0,1,1,0,1,1,0,1,0,1,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,0,0,1,1,0,1,1,1,0,1,1,0,0,0],
  [0,1,0,0,0,0,0,0,0,0,0,0,0,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const START_STUDENT: Cell = { x: 0, y: 0 };
const START_TEACHER: Cell = { x: COLS - 1, y: ROWS - 1 };
const SUBMISSION_DESK: Cell = { x: COLS - 1, y: 0 };
const PAGES: Cell[] = [
  { x: 4, y: 2 },
  { x: 9, y: 4 },
  { x: 2, y: 7 },
  { x: 10, y: 9 },
  { x: 7, y: 5 },
];

const eq = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const key = (c: Cell) => `${c.x},${c.y}`;
const isWall = (x: number, y: number) =>
  x < 0 || y < 0 || x >= COLS || y >= ROWS || LAYOUT[y][x] === 1;

function aStar(start: Cell, goal: Cell): Cell[] {
  if (isWall(goal.x, goal.y)) return [];
  const open = new Map<string, Cell>();
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const came = new Map<string, Cell>();
  const h = (c: Cell) => Math.abs(c.x - goal.x) + Math.abs(c.y - goal.y);

  open.set(key(start), start);
  gScore.set(key(start), 0);
  fScore.set(key(start), h(start));

  while (open.size > 0) {
    let current: Cell | null = null;
    let currentF = Infinity;
    for (const c of open.values()) {
      const f = fScore.get(key(c)) ?? Infinity;
      if (f < currentF) { currentF = f; current = c; }
    }
    if (!current) break;
    if (eq(current, goal)) {
      const path: Cell[] = [current];
      let k = key(current);
      while (came.has(k)) {
        const prev = came.get(k)!;
        path.unshift(prev);
        k = key(prev);
      }
      return path;
    }
    open.delete(key(current));
    const neighbors: Cell[] = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];
    for (const n of neighbors) {
      if (isWall(n.x, n.y)) continue;
      const tentative = (gScore.get(key(current)) ?? Infinity) + 1;
      if (tentative < (gScore.get(key(n)) ?? Infinity)) {
        came.set(key(n), current);
        gScore.set(key(n), tentative);
        fScore.set(key(n), tentative + h(n));
        open.set(key(n), n);
      }
    }
  }
  return [];
}

const TEACHER_INTERVAL: Record<Difficulty, number> = {
  easy: 600,
  medium: 420,
  hard: 280,
};

type Status = "playing" | "won" | "lost";

export default function EscapeTheTeacher() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [student, setStudent] = useState<Cell>(START_STUDENT);
  const [teacher, setTeacher] = useState<Cell>(START_TEACHER);
  const [collected, setCollected] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<Status>("playing");
  const [moves, setMoves] = useState(0);
  const [cell, setCell] = useState<number>(CELL_DESKTOP);

  // Responsive cell sizing — fit the grid to the viewport (especially on phones).
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Reserve space for header + controls + touchpad + padding
      const availW = vw - 24;
      const availH = vh - 320;
      const size = Math.max(18, Math.min(CELL_DESKTOP, Math.floor(Math.min(availW / COLS, availH / ROWS))));
      setCell(size);
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
    };
  }, []);

  const studentRef = useRef(student);
  studentRef.current = student;

  const move = useCallback((dx: number, dy: number) => {
    if (status !== "playing") return;
    setStudent((p) => {
      const nx = p.x + dx, ny = p.y + dy;
      if (isWall(nx, ny)) return p;
      return { x: nx, y: ny };
    });
    setMoves((m) => m + 1);
  }, [status]);

  const reset = useCallback(() => {
    setStudent(START_STUDENT);
    setTeacher(START_TEACHER);
    setCollected(new Set());
    setStatus("playing");
    setMoves(0);
  }, []);

  // Student movement
  useEffect(() => {
    if (status !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      let dx = 0, dy = 0;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": dy = -1; break;
        case "ArrowDown": case "s": case "S": dy = 1; break;
        case "ArrowLeft": case "a": case "A": dx = -1; break;
        case "ArrowRight": case "d": case "D": dx = 1; break;
        default: return;
      }
      e.preventDefault();
      move(dx, dy);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, move]);

  // Page collection + win/lose checks
  useEffect(() => {
    if (status !== "playing") return;
    const k = key(student);
    const pageHere = PAGES.find((p) => eq(p, student));
    if (pageHere && !collected.has(k)) {
      const next = new Set(collected);
      next.add(k);
      setCollected(next);
    }
    if (eq(student, teacher)) {
      setStatus("lost");
      return;
    }
    if (eq(student, SUBMISSION_DESK) && collected.size === PAGES.length) {
      setStatus("won");
    }
  }, [student, teacher, collected, status]);

  // Teacher AI tick using A*
  const speedMultiplier = useMemo(() => {
    // Gets faster as student collects pages
    return 1 - collected.size * 0.08;
  }, [collected.size]);

  useEffect(() => {
    if (status !== "playing") return;
    const base = TEACHER_INTERVAL[difficulty];
    const interval = Math.max(140, Math.floor(base * speedMultiplier));
    const id = setInterval(() => {
      setTeacher((t) => {
        const path = aStar(t, studentRef.current);
        if (path.length < 2) return t;
        return path[1];
      });
    }, interval);
    return () => clearInterval(id);
  }, [status, difficulty, speedMultiplier]);

  // Lose check after teacher moves
  useEffect(() => {
    if (status === "playing" && eq(teacher, student)) {
      setStatus("lost");
    }
  }, [teacher, student, status]);

  const remaining = PAGES.length - collected.size;
  const deskUnlocked = remaining === 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 gap-6">
      <header className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Escape the Teacher</h1>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground">
          Pages: <b>{collected.size}/{PAGES.length}</b>
        </div>
        <div className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground">
          Moves: <b>{moves}</b>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary">
          <span className="text-muted-foreground mr-1">Difficulty:</span>
          {(["easy","medium","hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => { setDifficulty(d); reset(); }}
              className={`px-2 py-1 rounded text-xs font-medium capitalize transition ${
                difficulty === d ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >{d}</button>
          ))}
        </div>
        <button
          onClick={reset}
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
        >Reset</button>
      </div>

      <div
        className="relative rounded-lg overflow-hidden border border-border shadow-lg"
        style={{
          width: COLS * cell,
          height: ROWS * cell,
          backgroundColor: "var(--muted)",
          touchAction: "none",
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          (e.currentTarget as any)._sx = t.clientX;
          (e.currentTarget as any)._sy = t.clientY;
        }}
        onTouchEnd={(e) => {
          const el = e.currentTarget as any;
          const t = e.changedTouches[0];
          const dx = t.clientX - el._sx;
          const dy = t.clientY - el._sy;
          const ax = Math.abs(dx), ay = Math.abs(dy);
          if (Math.max(ax, ay) < 16) return;
          if (ax > ay) move(dx > 0 ? 1 : -1, 0);
          else move(0, dy > 0 ? 1 : -1);
        }}
      >
        {/* Grid cells */}
        {LAYOUT.map((row, y) =>
          row.map((v, x) => (
            <div
              key={`${x}-${y}`}
              className="absolute"
              style={{
                left: x * cell,
                top: y * cell,
                width: cell,
                height: cell,
                backgroundColor: v === 1 ? "var(--primary)" : "transparent",
                borderRight: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
                borderBottom: "1px solid color-mix(in oklab, var(--border) 60%, transparent)",
                borderRadius: v === 1 ? 4 : 0,
              }}
            />
          ))
        )}

        {/* Submission desk */}
        <Tile cell={SUBMISSION_DESK} size={cell} label="🎯" bg={deskUnlocked ? "oklch(0.85 0.18 145)" : "oklch(0.85 0.05 145)"} title="Submission Desk" />

        {/* Pages */}
        {PAGES.filter((p) => !collected.has(key(p))).map((p) => (
          <Tile key={key(p)} cell={p} size={cell} label="📄" bg="transparent" />
        ))}

        {/* Student */}
        <Tile cell={student} size={cell} label="🧑‍🎓" bg="oklch(0.85 0.15 230)" rounded />

        {/* Teacher */}
        <Tile cell={teacher} size={cell} label="👨‍🏫" bg="oklch(0.75 0.2 25)" rounded />

        {/* Overlay */}
        {status !== "playing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center p-6 rounded-lg bg-card border border-border shadow-xl">
              <div className="text-4xl mb-2">{status === "won" ? "🏆" : "💀"}</div>
              <h2 className="text-2xl font-bold mb-1">
                {status === "won" ? "Assignment Submitted!" : "Caught by Teacher!"}
              </h2>
              <p className="text-muted-foreground mb-4 text-sm">
                {status === "won" ? `Finished in ${moves} moves.` : "Better luck next time."}
              </p>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
              >Play Again</button>
            </div>
          </div>
        )}
      </div>

      {/* Touch D-pad for phones */}
      <div className="md:hidden grid grid-cols-3 gap-2 select-none" style={{ touchAction: "manipulation" }}>
        <div />
        <button onTouchStart={(e) => { e.preventDefault(); move(0, -1); }} onClick={() => move(0, -1)} className="w-14 h-14 rounded-lg bg-secondary text-secondary-foreground text-xl font-bold active:bg-accent">▲</button>
        <div />
        <button onTouchStart={(e) => { e.preventDefault(); move(-1, 0); }} onClick={() => move(-1, 0)} className="w-14 h-14 rounded-lg bg-secondary text-secondary-foreground text-xl font-bold active:bg-accent">◀</button>
        <button onTouchStart={(e) => { e.preventDefault(); move(0, 1); }} onClick={() => move(0, 1)} className="w-14 h-14 rounded-lg bg-secondary text-secondary-foreground text-xl font-bold active:bg-accent">▼</button>
        <button onTouchStart={(e) => { e.preventDefault(); move(1, 0); }} onClick={() => move(1, 0)} className="w-14 h-14 rounded-lg bg-secondary text-secondary-foreground text-xl font-bold active:bg-accent">▶</button>
      </div>

    </div>
  );
}

function Tile({
  cell, size, label, bg, rounded, title,
}: { cell: Cell; size: number; label: string; bg: string; rounded?: boolean; title?: string }) {
  return (
    <div
      title={title}
      className="absolute flex items-center justify-center text-2xl transition-all duration-150"
      style={{
        left: cell.x * size + 2,
        top: cell.y * size + 2,
        width: size - 4,
        height: size - 4,
        fontSize: Math.max(12, Math.floor(size * 0.6)),
        backgroundColor: bg,
        borderRadius: rounded ? "50%" : 6,
      }}
    >
      {label}
    </div>
  );
}