"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Crown,
  FastForward,
  Gauge,
  Layers,
  List,
  Medal,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type {
  ScoreEvolutionMatch,
  ScoreEvolutionOverview,
  ScoreEvolutionParticipant,
  ScoreEvolutionPoint,
} from "@/lib/score-evolution";

const CHART_WIDTH = 920;
const CHART_HEIGHT = 430;
const PADDING = {
  top: 14,
  right: 30,
  bottom: 32,
  left: 30,
};
const COLOR_PALETTE = [
  "#dfff65",
  "#68a7ff",
  "#ffae42",
  "#f1f5f9",
  "#5ee0a1",
  "#a679ff",
  "#ffdd4a",
  "#ff6f9f",
  "#5ce1e6",
  "#c7d2fe",
  "#fb7185",
  "#34d399",
];
const REPLAY_DELAYS = {
  "0.5x": 980,
  "1x": 620,
  "1.5x": 420,
};
const PATH_REPLAY_DURATION_MS = 1320;
const PATH_REPLAY_REDUCED_MOTION_MS = 620;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type StageFilter = "all" | "group" | "knockout";
type ParticipantFilter = "top5" | "top10" | "all";
type ReplaySpeed = keyof typeof REPLAY_DELAYS;
type PathReplay = {
  id: number;
  participantKey: string;
  participantName: string;
  participantInitials: string;
  avatarUrl?: string;
  color: string;
  path: string;
  pointCount: number;
  endX: number;
  endY: number;
  totalPoints: number;
};
type PathReplayState = {
  active: PathReplay | null;
  queue: PathReplay[];
};

export function ScoreEvolutionRace({
  overview,
}: {
  overview: ScoreEvolutionOverview;
}) {
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [participantFilter, setParticipantFilter] =
    useState<ParticipantFilter>("top10");
  const [progressIndex, setProgressIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>("1x");
  const [hovered, setHovered] = useState<{
    participantKey: string;
    matchNumber: number;
  } | null>(null);
  const [pathReplayState, setPathReplayState] = useState<PathReplayState>({
    active: null,
    queue: [],
  });
  const activePathReplay = pathReplayState.active;
  const pathReplayQueue = pathReplayState.queue;
  const prefersReducedMotion = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const autoStartedRef = useRef(false);
  const progressRef = useRef(progressIndex);
  const pathReplayIdRef = useRef(0);
  const rankingAnimationKeyRef = useRef("");
  const rankingRowRefs = useRef(new Map<string, HTMLElement>());
  const previousRankingRects = useRef(new Map<string, DOMRect>());

  const stageMatches = useMemo(
    () => filterMatchesByStage(overview.matches, stageFilter),
    [overview.matches, stageFilter],
  );
  const visibleParticipants = useMemo(
    () => filterParticipants(overview.participants, participantFilter),
    [overview.participants, participantFilter],
  );
  const safeProgressIndex = Math.min(
    Math.max(0, progressIndex),
    Math.max(0, stageMatches.length - 1),
  );
  const activeMatchIndex = Math.min(
    Math.max(0, Math.ceil(safeProgressIndex)),
    Math.max(0, stageMatches.length - 1),
  );
  const rankingProgressIndex = Math.min(
    Math.max(0, prefersReducedMotion ? Math.round(safeProgressIndex) : Math.floor(safeProgressIndex + 0.78)),
    Math.max(0, stageMatches.length - 1),
  );
  const highlightedParticipantKey = hovered?.participantKey ?? null;

  useEffect(() => {
    progressRef.current = progressIndex;
  }, [progressIndex]);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || autoStartedRef.current || stageMatches.length <= 1) return;

    if (prefersReducedMotion) {
      autoStartedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || autoStartedRef.current) return;
        autoStartedRef.current = true;
        setProgressIndex(0);
        setPlaying(true);
      },
      { threshold: 0.32 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [prefersReducedMotion, stageMatches.length]);

  useEffect(() => {
    if (!playing || stageMatches.length <= 1) return;
    const target = stageMatches.length - 1;
    const startValue =
      progressRef.current >= target - 0.001 ? 0 : progressRef.current;

    if (prefersReducedMotion) {
      setProgressIndex(startValue);
      const timer = window.setInterval(() => {
        setProgressIndex((value) => {
          if (value >= target) {
            window.clearInterval(timer);
            setPlaying(false);
            return target;
          }
          return Math.min(target, Math.floor(value) + 1);
        });
      }, REPLAY_DELAYS[speed]);
      return () => window.clearInterval(timer);
    }

    let frameId = 0;
    let startedAt: number | null = null;
    const millisecondsPerMatch = REPLAY_DELAYS[speed];

    const step = (timestamp: number) => {
      startedAt ??= timestamp;
      const elapsed = timestamp - startedAt;
      const rawProgress = startValue + elapsed / millisecondsPerMatch;

      if (rawProgress >= target) {
        setProgressIndex(target);
        setPlaying(false);
        return;
      }

      setProgressIndex(rawProgress);
      frameId = window.requestAnimationFrame(step);
    };

    setProgressIndex(startValue);
    frameId = window.requestAnimationFrame(step);

    return () => window.cancelAnimationFrame(frameId);
  }, [playing, prefersReducedMotion, speed, stageMatches.length]);

  useEffect(() => {
    if (!activePathReplay) return;

    const timer = window.setTimeout(
      () =>
        setPathReplayState((currentState) => {
          if (currentState.active?.id !== activePathReplay.id) {
            return currentState;
          }

          const [nextReplay, ...remainingQueue] = currentState.queue;
          return {
            active: nextReplay ?? null,
            queue: remainingQueue,
          };
        }),
      prefersReducedMotion
        ? PATH_REPLAY_REDUCED_MOTION_MS
        : PATH_REPLAY_DURATION_MS + 260,
    );

    return () => window.clearTimeout(timer);
  }, [activePathReplay, prefersReducedMotion]);

  const chart = useMemo(
    () =>
      buildChartModel({
        participants: visibleParticipants,
        matches: stageMatches,
        points: overview.points,
        progressIndex: safeProgressIndex,
        highlightedParticipantKey,
      }),
    [
      highlightedParticipantKey,
      overview.points,
      safeProgressIndex,
      stageMatches,
      visibleParticipants,
    ],
  );
  const snapshot = useMemo(
    () =>
      currentRankingSnapshot({
        participants: overview.participants,
        matches: stageMatches,
        points: overview.points,
        progressIndex: rankingProgressIndex,
      }),
    [overview.participants, overview.points, rankingProgressIndex, stageMatches],
  );
  const hoverContext = hovered
    ? chart.hoverPoints.find(
        (point) =>
          point.participant.key === hovered.participantKey &&
          point.match.number === hovered.matchNumber,
      ) ?? null
    : null;
  const currentMatch = stageMatches[activeMatchIndex] ?? stageMatches.at(-1) ?? null;
  const leaderKey = snapshot.at(0)?.participant.key ?? null;
  const queuedPathReplayKeys = useMemo(
    () => new Set(pathReplayQueue.map((replay) => replay.participantKey)),
    [pathReplayQueue],
  );
  const rankingAnimationKey = snapshot
    .slice(0, 8)
    .map((row) => `${row.participant.key}:${row.rank}`)
    .join("|");

  const clearPathReplay = () => {
    setPathReplayState({ active: null, queue: [] });
  };

  const enqueuePathReplay = (participantKey: string) => {
    const series = chart.series.find(
      (item) => item.participant.key === participantKey,
    );
    const endpoint = series?.points.at(-1);
    if (!series || !endpoint) return;

    setPlaying(false);
    setHovered(null);
    pathReplayIdRef.current += 1;
    const replay: PathReplay = {
      id: pathReplayIdRef.current,
      participantKey,
      participantName: series.participant.name,
      participantInitials: series.participant.initials,
      avatarUrl: series.participant.avatarUrl,
      color: series.color,
      path: series.path,
      pointCount: series.points.length,
      endX: endpoint.x,
      endY: endpoint.y,
      totalPoints: endpoint.score.totalPoints,
    };
    setPathReplayState((currentState) =>
      currentState.active
        ? {
            active: currentState.active,
            queue: [...currentState.queue, replay],
          }
        : {
            active: replay,
            queue: currentState.queue,
          },
    );
  };

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();

    for (const [key, element] of rankingRowRefs.current) {
      const nextRect = element.getBoundingClientRect();
      const previousRect = previousRankingRects.current.get(key);
      nextRects.set(key, nextRect);

      if (!previousRect || rankingAnimationKeyRef.current === rankingAnimationKey) {
        continue;
      }

      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaY) < 1) continue;

      const animation = element.animate(
        [
          { transform: `translateY(${deltaY}px) scale(0.985)` },
          { transform: "translateY(0) scale(1)" },
        ],
        {
          duration: prefersReducedMotion ? 0 : 820,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        },
      );
      element.style.zIndex = "3";
      const clearZIndex = () => {
        element.style.zIndex = "";
      };
      animation.addEventListener("finish", clearZIndex, { once: true });
      animation.addEventListener("cancel", clearZIndex, { once: true });
    }

    previousRankingRects.current = nextRects;
    rankingAnimationKeyRef.current = rankingAnimationKey;
  }, [prefersReducedMotion, rankingAnimationKey]);

  if (!overview.available) {
    return (
      <section className="mt-7 md:mt-10" aria-labelledby="score-evolution-title">
        <div className="hero-panel overflow-hidden rounded-[1.75rem] p-5 text-white md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="eyebrow !text-accent">Replay do bolão</p>
              <h2 id="score-evolution-title" className="mt-1 text-2xl font-black md:text-3xl">
                Corrida da classificação
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                Assim que houver jogos finalizados e pontuação pública, a home mostra
                a evolução dos participantes jogo a jogo.
              </p>
            </div>
            <BarChart3 className="size-9 text-accent" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="mt-7 md:mt-10"
      aria-labelledby="score-evolution-title"
      onMouseLeave={() => setHovered(null)}
    >
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Replay do bolão</p>
          <h2 id="score-evolution-title" className="mt-1 text-2xl font-black tracking-[-0.04em] md:text-3xl">
            Corrida da classificação
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            A pontuação acumulada de cada palpiteiro, com replay para ver quem
            disparou, quem virou e quem ficou pelo caminho.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-black">
          <span className="rounded-full bg-surface px-3 py-2 text-muted shadow-sm">
            {overview.participantCount} jogadores
          </span>
          <span className="rounded-full bg-surface px-3 py-2 text-muted shadow-sm">
            {overview.completedMatches} jogos finalizados
          </span>
        </div>
      </div>

      <div
        data-race-panel="true"
        className="overflow-hidden rounded-[1.1rem] bg-[#06170f] text-white shadow-2xl shadow-brand/10 ring-1 ring-white/[0.055]"
      >
        <div
          data-race-toolbar="true"
          className="border-b border-white/[0.06] bg-black/10 px-2 py-2 md:px-3"
        >
          <div className="grid grid-cols-2 items-center gap-2 xl:grid-cols-[auto_auto_minmax(12rem,1fr)_auto_auto]">
            <IconSegmentedControl
              label="Fase"
              value={stageFilter}
              options={[
                { value: "all", label: "Geral", icon: Layers },
                { value: "group", label: "Grupos", icon: Users },
                { value: "knockout", label: "Mata-mata", icon: Swords },
              ]}
              onChange={(value) => {
                setStageFilter(value);
                setPlaying(false);
                setProgressIndex(0);
                clearPathReplay();
              }}
            />
            <IconSegmentedControl
              label="Participantes"
              value={participantFilter}
              options={[
                { value: "top5", label: "Top 5", icon: Medal },
                { value: "top10", label: "Top 10", icon: Crown },
                { value: "all", label: "Todos", icon: List },
              ]}
              onChange={(value) => {
                setParticipantFilter(value);
                clearPathReplay();
              }}
            />
            <label className="col-span-2 min-w-0 xl:col-span-1">
              <span className="sr-only">Navegar pelos jogos finalizados</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, stageMatches.length - 1)}
                step={0.001}
                value={safeProgressIndex}
                onChange={(event) => {
                  setPlaying(false);
                  setProgressIndex(Number(event.target.value));
                  clearPathReplay();
                }}
                className="w-full accent-[var(--accent)]"
              />
            </label>
            <div className="col-span-2 min-w-0 truncate rounded-full bg-white/[0.06] px-3 py-2 text-xs font-black text-white/78 ring-1 ring-white/8 xl:col-span-1">
              {currentMatch ? `Jogo ${currentMatch.number} · ${currentMatch.label}` : "Sem jogos"}
            </div>
            <div className="col-span-2 flex flex-wrap items-center justify-end gap-1.5 xl:col-span-1">
              <SpeedControl speed={speed} onChange={setSpeed} />
              <button
                type="button"
                title={playing ? "Pausar" : "Reproduzir"}
                aria-label={playing ? "Pausar corrida" : "Reproduzir corrida"}
                onClick={() => {
                  clearPathReplay();
                  if (safeProgressIndex >= stageMatches.length - 1) {
                    setProgressIndex(0);
                  }
                  setPlaying((value) => !value);
                }}
                className="interactive inline-flex size-9 items-center justify-center rounded-full bg-accent text-brand-strong shadow-lg shadow-accent/10 md:size-10"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button
                type="button"
                title="Reiniciar"
                onClick={() => {
                  setPlaying(false);
                  setProgressIndex(0);
                  clearPathReplay();
                }}
                className="interactive inline-flex size-9 items-center justify-center rounded-full bg-white/7 text-white/80 ring-1 ring-white/10 hover:bg-white/12 md:size-10"
                aria-label="Reiniciar corrida"
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-0 overflow-visible xl:grid-cols-[minmax(0,1fr)_14.75rem]">
          <div className="relative z-10 min-h-[18rem] min-w-0 overflow-visible px-0 pb-0 pt-0 md:min-h-[27rem] xl:min-h-[30rem]">
            <div className="absolute left-3 top-3 z-10 rounded-full bg-black/18 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/58 ring-1 ring-white/8 backdrop-blur md:left-4 md:top-4">
              Pontuação acumulada
            </div>
            <div className="race-chart-stage absolute -bottom-2 left-0 right-0 -top-2">
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                role="img"
                aria-label="Gráfico de evolução da pontuação acumulada no bolão"
                className="h-full w-full overflow-visible"
              >
                <defs>
                  <linearGradient id="raceChartPlot" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
                  </linearGradient>
                </defs>
                <rect
                  x={PADDING.left}
                  y={PADDING.top}
                  width={chart.plotWidth}
                  height={chart.plotHeight}
                  fill="url(#raceChartPlot)"
                  rx="14"
                />
                {chart.yTicks.map((tick) => (
                  <g key={tick.value}>
                    <line
                      x1={PADDING.left}
                      x2={PADDING.left + chart.plotWidth}
                      y1={tick.y}
                      y2={tick.y}
                      stroke="rgba(255,255,255,0.08)"
                    />
                    <text
                      x={PADDING.left - 8}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="fill-white/45 text-[12px] font-bold"
                    >
                      {tick.value}
                    </text>
                  </g>
                ))}
                {chart.xTicks.map((tick) => (
                  <g key={tick.match.number}>
                    <line
                      x1={tick.x}
                      x2={tick.x}
                      y1={PADDING.top}
                      y2={PADDING.top + chart.plotHeight}
                      stroke="rgba(255,255,255,0.055)"
                    />
                    <text
                      x={tick.x}
                      y={PADDING.top + chart.plotHeight + 24}
                      textAnchor="middle"
                      className="fill-white/55 text-[12px] font-bold"
                    >
                      {tick.match.number}
                    </text>
                  </g>
                ))}

                {chart.series.map((series) => (
                  <g key={series.participant.key}>
                    <path
                      className="race-score-line"
                      d={series.path}
                      fill="none"
                      stroke={series.color}
                      strokeWidth={series.emphasized ? 4 : 2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      opacity={series.dimmed ? 0.22 : 0.9}
                      style={{
                        filter: series.emphasized
                          ? `drop-shadow(0 0 10px ${series.color}66)`
                          : undefined,
                        transition: "opacity 160ms ease, stroke-width 160ms ease",
                      }}
                    />
                    {series.isLeader ? (
                      <path
                        d={series.path}
                        className="race-heartbeat-trace"
                        fill="none"
                        stroke={series.color}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                    {series.points.map((point) => (
                      <circle
                        key={`${series.participant.key}-${point.match.number}`}
                        cx={point.x}
                        cy={point.y}
                        r={10}
                        fill="transparent"
                        onMouseEnter={() =>
                          setHovered({
                            participantKey: series.participant.key,
                            matchNumber: point.match.number,
                          })
                        }
                      />
                    ))}
                  </g>
                ))}

                {chart.endpointMarkers.map((marker) => {
                  const clipPathId = `race-avatar-${svgSafeId(marker.participant.key)}`;
                  const markerRadius = marker.isLeader || marker.selected ? 23 : 17;
                  const imageRadius = markerRadius - 3;
                  const scoreOnLeft = marker.x > CHART_WIDTH - 82;
                  const scoreX =
                    marker.x + (scoreOnLeft ? -markerRadius - 9 : markerRadius + 9);

                  return (
                    <g
                      key={marker.participant.key}
                      className={`race-endpoint-marker ${
                        marker.isLeader ? "race-leader-avatar" : ""
                      }`}
                      onMouseEnter={() =>
                        setHovered({
                          participantKey: marker.participant.key,
                          matchNumber: marker.point.match.number,
                        })
                      }
                    >
                      {marker.isLeader ? (
                        <>
                          <circle
                            className="race-leader-ring"
                            cx={marker.x}
                            cy={marker.y}
                            r={markerRadius + 8}
                            fill="none"
                            stroke={marker.color}
                          />
                          <circle
                            className="race-leader-ring race-leader-ring-delayed"
                            cx={marker.x}
                            cy={marker.y}
                            r={markerRadius + 8}
                            fill="none"
                            stroke={marker.color}
                          />
                        </>
                      ) : null}
                      <circle
                        cx={marker.x}
                        cy={marker.y}
                        r={markerRadius + 3}
                        fill="#06170f"
                        stroke={marker.selected ? "#dfff65" : marker.color}
                        strokeWidth={marker.selected ? 4 : 3}
                        opacity="0.98"
                      />
                      {marker.participant.avatarUrl ? (
                        <>
                          <clipPath id={clipPathId}>
                            <circle
                              cx={marker.x}
                              cy={marker.y}
                              r={imageRadius}
                            />
                          </clipPath>
                          <image
                            href={marker.participant.avatarUrl}
                            x={marker.x - imageRadius}
                            y={marker.y - imageRadius}
                            width={imageRadius * 2}
                            height={imageRadius * 2}
                            clipPath={`url(#${clipPathId})`}
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </>
                      ) : (
                        <>
                          <circle
                            cx={marker.x}
                            cy={marker.y}
                            r={imageRadius}
                            fill={marker.color}
                          />
                          <text
                            x={marker.x}
                            y={marker.y + 4}
                            textAnchor="middle"
                            className="fill-[#06170f] text-[10px] font-black"
                          >
                            {marker.participant.initials.slice(0, 2)}
                          </text>
                        </>
                      )}
                      <text
                        x={scoreX}
                        y={marker.y + 5}
                        textAnchor={scoreOnLeft ? "end" : "start"}
                        className={
                          marker.isLeader || marker.selected
                            ? "text-[17px] font-black"
                            : "text-[14px] font-black"
                        }
                        fill={marker.color}
                      >
                        {Math.round(marker.point.score.totalPoints)}
                      </text>
                    </g>
                  );
                })}

                {activePathReplay ? (
                  <g
                    key={activePathReplay.id}
                    className="race-path-replay"
                    data-participant-key={activePathReplay.participantKey}
                    data-replay-id={activePathReplay.id}
                    aria-hidden="true"
                  >
                    <path
                      className="race-path-replay-glow"
                      d={activePathReplay.path}
                      fill="none"
                      pathLength={1}
                      stroke={activePathReplay.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      id={`race-path-replay-${activePathReplay.id}`}
                      className="race-path-replay-line"
                      d={activePathReplay.path}
                      fill="none"
                      pathLength={1}
                      stroke={activePathReplay.color}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      className="race-path-replay-target"
                      cx={activePathReplay.endX}
                      cy={activePathReplay.endY}
                      r={24}
                      fill="none"
                      stroke={activePathReplay.color}
                    />
                    <g
                      className="race-path-replay-runner"
                      transform={
                        !prefersReducedMotion && activePathReplay.pointCount > 1
                          ? undefined
                          : `translate(${activePathReplay.endX} ${activePathReplay.endY})`
                      }
                    >
                      {!prefersReducedMotion && activePathReplay.pointCount > 1 ? (
                        <animateMotion
                          dur={`${PATH_REPLAY_DURATION_MS}ms`}
                          fill="freeze"
                          calcMode="spline"
                          keyTimes="0;1"
                          keySplines="0.16 1 0.3 1"
                        >
                          <mpath href={`#race-path-replay-${activePathReplay.id}`} />
                        </animateMotion>
                      ) : null}
                      <circle
                        r={18}
                        fill="#06170f"
                        stroke={activePathReplay.color}
                        strokeWidth={4}
                      />
                      {activePathReplay.avatarUrl ? (
                        <>
                          <defs>
                            <clipPath
                              id={`race-path-replay-clip-${activePathReplay.id}`}
                              clipPathUnits="objectBoundingBox"
                            >
                              <circle cx="0.5" cy="0.5" r="0.5" />
                            </clipPath>
                          </defs>
                          <image
                            href={activePathReplay.avatarUrl}
                            x={-13}
                            y={-13}
                            width={26}
                            height={26}
                            clipPath={`url(#race-path-replay-clip-${activePathReplay.id})`}
                            preserveAspectRatio="xMidYMid slice"
                          />
                        </>
                      ) : (
                        <>
                          <circle r={13} fill={activePathReplay.color} />
                          <text
                            y={4}
                            textAnchor="middle"
                            className="fill-[#06170f] text-[10px] font-black"
                          >
                            {activePathReplay.participantInitials.slice(0, 2)}
                          </text>
                        </>
                      )}
                    </g>
                    <text
                      x={Math.min(activePathReplay.endX + 28, CHART_WIDTH - 16)}
                      y={activePathReplay.endY + 5}
                      textAnchor={
                        activePathReplay.endX > CHART_WIDTH - 90 ? "end" : "start"
                      }
                      className="race-path-replay-score text-[15px] font-black"
                      fill={activePathReplay.color}
                    >
                      {Math.round(activePathReplay.totalPoints)}
                    </text>
                  </g>
                ) : null}
              </svg>
            </div>

            {hoverContext ? (
              <div
                className="pointer-events-none absolute z-20 w-64 rounded-2xl border border-white/12 bg-[#07120d]/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur"
                style={{
                  left: `${Math.min(72, Math.max(8, (hoverContext.x / CHART_WIDTH) * 100))}%`,
                  top: `${Math.min(70, Math.max(12, (hoverContext.y / CHART_HEIGHT) * 100))}%`,
                }}
              >
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={hoverContext.participant.name}
                    initials={hoverContext.participant.initials}
                    avatarUrl={hoverContext.participant.avatarUrl}
                    className="size-10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">
                      {hoverContext.participant.name}
                    </p>
                    <p className="text-[11px] font-bold text-white/50">
                      {hoverContext.score.rankAfterMatch}º após o jogo
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl bg-white/7 p-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-accent">
                    Jogo {hoverContext.match.number}
                  </p>
                  <p className="mt-1 text-sm font-black">{hoverContext.match.label}</p>
                  <p className="text-xs text-white/55">
                    {hoverContext.match.stageLabel} · {hoverContext.match.resultLabel}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <MiniTooltipStat label="No jogo" value={`+${hoverContext.score.pointsInMatch}`} />
                  <MiniTooltipStat label="Total" value={String(hoverContext.score.totalPoints)} />
                  <MiniTooltipStat label="Cravadas" value={String(hoverContext.score.exactScores)} />
                </div>
              </div>
            ) : null}
          </div>

          <aside className="relative z-20 border-t border-white/[0.06] bg-black/8 p-2.5 xl:border-l xl:border-t-0 xl:border-white/[0.06]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-accent">
                  Ranking no momento
                </p>
                <h3 className="mt-1 text-sm font-black">
                  {currentMatch ? `Após o jogo ${currentMatch.number}` : "Classificação"}
                </h3>
              </div>
              <Trophy className="size-5 text-accent" />
            </div>
            <div className="mt-3 grid gap-1.5 overflow-hidden py-1">
              {snapshot.slice(0, 8).map((row) => {
                const rowSelected =
                  row.participant.key === activePathReplay?.participantKey ||
                  queuedPathReplayKeys.has(row.participant.key);
                return (
                <button
                  key={row.participant.key}
                  ref={(element) => {
                    if (element) {
                      rankingRowRefs.current.set(row.participant.key, element);
                    } else {
                      rankingRowRefs.current.delete(row.participant.key);
                    }
                  }}
                  type="button"
                  data-race-participant-key={row.participant.key}
                  title={`Animar trajeto de ${row.participant.name}`}
                  aria-label={`Animar trajeto de ${row.participant.name}`}
                  aria-pressed={rowSelected}
                  onClick={() => enqueuePathReplay(row.participant.key)}
                  className={`race-ranking-row interactive flex w-full items-center gap-2 rounded-lg p-2 text-left ${
                    rowSelected
                      ? "race-ranking-selected bg-accent/18 ring-2 ring-accent/55"
                      : row.participant.key === leaderKey
                      ? "race-ranking-leader bg-accent/16"
                      : row.participant.isCurrentUser
                      ? "bg-accent/10 ring-1 ring-accent/30"
                      : "bg-white/[0.035] ring-1 ring-white/[0.055]"
                  }`}
                >
                  <span className="w-7 text-center text-sm font-black text-white/55">
                    {row.rank}º
                  </span>
                  <UserAvatar
                    name={row.participant.name}
                    initials={row.participant.initials}
                    avatarUrl={row.participant.avatarUrl}
                    className={row.participant.key === leaderKey ? "size-9 ring-2 ring-accent/75" : "size-7"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black">{row.participant.name}</p>
                    <p className="text-[11px] text-white/45">
                      {row.exactScores} cravadas · {row.correctResults} resultados
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-accent">{row.totalPoints}</p>
                    <MovementBadge delta={row.positionDelta} />
                  </div>
                </button>
                );
              })}
            </div>
          </aside>
        </div>

        <div className="grid gap-2 border-t border-white/[0.07] bg-white/[0.02] p-3 md:grid-cols-2 xl:grid-cols-4">
          {overview.highlights.map((highlight) => (
            <HighlightCard key={highlight.title} highlight={highlight} />
          ))}
        </div>
      </div>
    </section>
  );
}

function IconSegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; icon: LucideIcon }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="race-control-label text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
        {label}
      </span>
      <div className="inline-flex rounded-full bg-black/14 p-0.5 ring-1 ring-white/10 md:p-1">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              title={option.label}
              aria-label={option.label}
              aria-pressed={option.value === value}
              onClick={() => onChange(option.value)}
              className={`interactive inline-flex size-8 items-center justify-center rounded-full md:size-9 ${
                option.value === value
                  ? "bg-accent text-brand-strong"
                  : "text-white/62 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon className="size-4" />
              <span className="sr-only">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpeedControl({
  speed,
  onChange,
}: {
  speed: ReplaySpeed;
  onChange: (speed: ReplaySpeed) => void;
}) {
  const speedOptions: Array<{
    value: ReplaySpeed;
    label: string;
    icon: LucideIcon;
  }> = [
    { value: "0.5x", label: "Lento", icon: Gauge },
    { value: "1x", label: "Médio", icon: Zap },
    { value: "1.5x", label: "Rápido", icon: FastForward },
  ];

  return (
    <div className="inline-flex min-h-9 items-center rounded-full bg-black/14 p-0.5 ring-1 ring-white/10 md:min-h-10 md:p-1">
      <FastForward className="mx-1.5 size-4 text-white/45 md:mx-2" />
      {speedOptions.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            type="button"
            title={`${item.label} (${item.value})`}
            aria-label={`Velocidade ${item.label} ${item.value}`}
            aria-pressed={speed === item.value}
            onClick={() => onChange(item.value)}
            className={`interactive inline-flex size-7 items-center justify-center rounded-full md:size-8 ${
              speed === item.value
                ? "bg-white/13 text-accent"
                : "text-white/55 hover:text-white"
            }`}
          >
            <Icon className="size-4" />
            <span className="sr-only">{item.value}</span>
          </button>
        );
      })}
    </div>
  );
}

function MovementBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center justify-end gap-0.5 text-[10px] font-black text-[#7cff9f]">
        <ArrowUpRight className="size-3" />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center justify-end gap-0.5 text-[10px] font-black text-[#ff7b9d]">
        <ArrowDownRight className="size-3" />
        {Math.abs(delta)}
      </span>
    );
  }
  return <span className="text-[10px] font-black text-white/35">=</span>;
}

function MiniTooltipStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/7 px-2 py-2">
      <p className="text-[10px] font-bold text-white/45">{label}</p>
      <p className="mt-0.5 text-sm font-black text-accent">{value}</p>
    </div>
  );
}

function HighlightCard({
  highlight,
}: {
  highlight: ScoreEvolutionOverview["highlights"][number];
}) {
  const Icon =
    highlight.tone === "down"
      ? ArrowDownRight
      : highlight.tone === "gold"
        ? Sparkles
        : highlight.tone === "up"
          ? ArrowUpRight
          : Target;
  const toneClass =
    highlight.tone === "down"
      ? "text-[#ff7b9d]"
      : highlight.tone === "gold"
        ? "text-accent"
        : highlight.tone === "up"
          ? "text-[#7cff9f]"
          : "text-white";

  return (
    <article className="rounded-xl bg-black/10 p-3 ring-1 ring-white/[0.06]">
      <div className="flex items-start gap-3">
        <Icon className={`mt-1 size-6 shrink-0 ${toneClass}`} />
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/45">
            {highlight.title}
          </p>
          <p className="mt-1 truncate text-base font-black">{highlight.value}</p>
          <p className="mt-1 text-xs leading-5 text-white/58">{highlight.detail}</p>
        </div>
      </div>
    </article>
  );
}

function filterMatchesByStage(
  matches: ScoreEvolutionMatch[],
  filter: StageFilter,
) {
  if (filter === "all") return matches;
  if (filter === "group") {
    const groupMatches = matches.filter((match) => match.stage === "group");
    return groupMatches.length > 0 ? groupMatches : matches;
  }
  const knockoutMatches = matches.filter((match) => match.stage !== "group");
  return knockoutMatches.length > 0 ? knockoutMatches : matches;
}

function filterParticipants(
  participants: ScoreEvolutionParticipant[],
  filter: ParticipantFilter,
) {
  if (filter === "all") return participants;
  const limit = filter === "top5" ? 5 : 10;
  return participants.slice(0, limit);
}

type ChartViewPoint = {
  x: number;
  y: number;
  score: ScoreEvolutionPoint;
  match: ScoreEvolutionMatch;
  participant: ScoreEvolutionParticipant;
  virtual?: boolean;
};

type ParticipantPointTrack = Array<{
  point: ScoreEvolutionPoint;
  position: number;
}>;

type RankingSnapshotRow = ScoreEvolutionPoint & {
  participant: ScoreEvolutionParticipant;
  rank: number;
  baseRank: number;
  progressFraction: number;
};

function buildChartModel({
  participants,
  matches,
  points,
  progressIndex,
  highlightedParticipantKey,
}: {
  participants: ScoreEvolutionParticipant[];
  matches: ScoreEvolutionMatch[];
  points: ScoreEvolutionPoint[];
  progressIndex: number;
  highlightedParticipantKey: string | null;
}) {
  const safeProgressIndex = clamp(progressIndex, 0, Math.max(0, matches.length - 1));
  const baseIndex = Math.floor(safeProgressIndex);
  const revealIndex = Math.ceil(safeProgressIndex);
  const matchPositions = new Map(
    matches.map((match, index) => [match.number, index]),
  );
  const participantPositions = new Map(
    participants.map((participant, index) => [participant.key, index]),
  );
  const tracks = buildParticipantTracks(points, matchPositions);
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const selectedStagePoints = points.filter(
    (point) =>
      participantPositions.has(point.participantKey) &&
      matchPositions.has(point.matchNumber),
  );
  const maxPoints = Math.max(
    1,
    ...selectedStagePoints.map((point) => point.totalPoints),
  );
  const maxY = niceMax(maxPoints);
  const yTicks = Array.from({ length: 6 }, (_, index) => {
    const value = Math.round((maxY / 5) * index);
    return {
      value,
      y: PADDING.top + plotHeight - (value / maxY) * plotHeight,
    };
  });
  const xTicks = buildXTicks(matches, plotWidth);
  const hoverPoints: ChartViewPoint[] = [];
  const rankingAtProgress = rankParticipantsAtProgress({
    participants,
    tracks,
    progressIndex: safeProgressIndex,
    matchCount: matches.length,
  });
  const rankByParticipantKey = new Map(
    rankingAtProgress.map((row) => [row.participant.key, row.rank]),
  );
  const leaderKeyAtProgress = rankingAtProgress.at(0)?.participant.key ?? null;

  const series = participants.map((participant, index) => {
    const color = COLOR_PALETTE[index % COLOR_PALETTE.length];
    const track = tracks.get(participant.key) ?? [];
    const participantPoints = track
      .filter(({ position }) => position <= baseIndex)
      .map(({ point, position }) =>
        pointToChartView({
          point,
          position,
          participant,
          matches,
          plotWidth,
          plotHeight,
          maxY,
        }),
      );
    const nextPoint = pointAtProgress({
      participant,
      track,
      progressIndex: safeProgressIndex,
      matchCount: matches.length,
    });

    if (
      nextPoint &&
      revealIndex > baseIndex &&
      Math.abs(safeProgressIndex - baseIndex) > 0.001
    ) {
      const virtualPoint = pointToChartView({
        point: nextPoint.point,
        position: safeProgressIndex,
        participant,
        matches,
        plotWidth,
        plotHeight,
        maxY,
        virtual: true,
      });

      if (
        participantPoints.at(-1)?.score.matchNumber !==
        virtualPoint.score.matchNumber
      ) {
        participantPoints.push(virtualPoint);
      } else {
        participantPoints[participantPoints.length - 1] = virtualPoint;
      }
    }

    for (const viewPoint of participantPoints) {
      if (!viewPoint.virtual) hoverPoints.push(viewPoint);
    }

    const emphasized =
      participant.isCurrentUser ||
      participant.finalRank <= 3 ||
      participant.key === leaderKeyAtProgress;
    return {
      participant,
      color,
      rank: rankByParticipantKey.get(participant.key) ?? Number.MAX_SAFE_INTEGER,
      emphasized,
      isLeader: participant.key === leaderKeyAtProgress,
      dimmed:
        highlightedParticipantKey !== null &&
        highlightedParticipantKey !== participant.key,
      points: participantPoints,
      path: pointsToPath(participantPoints),
    };
  });

  const renderedSeries = series.toSorted(
    (left, right) =>
      right.rank - left.rank ||
      left.participant.name.localeCompare(right.participant.name, "pt-BR"),
  );

  const endpointMarkers = renderedSeries
    .map((item) => {
      const point = item.points.at(-1);
      if (!point) return null;
      return {
        participant: item.participant,
        point,
        color: item.color,
        x: point.x,
        y: point.y,
        isLeader: item.isLeader,
        rank: item.rank,
        selected: highlightedParticipantKey === item.participant.key,
      };
    })
    .filter(Boolean) as Array<{
    participant: ScoreEvolutionParticipant;
    point: ChartViewPoint;
    color: string;
    x: number;
    y: number;
    isLeader: boolean;
    rank: number;
    selected: boolean;
  }>;

  return {
    plotWidth,
    plotHeight,
    yTicks,
    xTicks,
    series: renderedSeries,
    endpointMarkers,
    hoverPoints,
  };
}

function buildXTicks(matches: ScoreEvolutionMatch[], plotWidth: number) {
  if (matches.length === 0) return [];
  const desired = Math.min(6, matches.length);
  const indexes = new Set<number>();
  for (let index = 0; index < desired; index += 1) {
    indexes.add(Math.round((index / Math.max(1, desired - 1)) * (matches.length - 1)));
  }
  return [...indexes].toSorted((left, right) => left - right).map((index) => ({
    match: matches[index],
    x:
      PADDING.left +
      (index / Math.max(1, matches.length - 1)) * plotWidth,
  }));
}

function pointsToPath(
  points: Array<{
    x: number;
    y: number;
  }>,
) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)} L ${(point.x + 0.01).toFixed(2)} ${point.y.toFixed(2)}`;
  }
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    const previous = points[index - 1];
    const midX = previous.x + (point.x - previous.x) * 0.5;
    return `${path} C ${midX.toFixed(2)} ${previous.y.toFixed(2)} ${midX.toFixed(2)} ${point.y.toFixed(2)} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");
}

function currentRankingSnapshot({
  participants,
  matches,
  points,
  progressIndex,
}: {
  participants: ScoreEvolutionParticipant[];
  matches: ScoreEvolutionMatch[];
  points: ScoreEvolutionPoint[];
  progressIndex: number;
}) {
  const matchPositions = new Map(
    matches.map((match, index) => [match.number, index]),
  );
  const tracks = buildParticipantTracks(points, matchPositions);
  const safeProgressIndex = clamp(progressIndex, 0, Math.max(0, matches.length - 1));

  return rankParticipantsAtProgress({
    participants,
    tracks,
    progressIndex: safeProgressIndex,
    matchCount: matches.length,
  });
}

function niceMax(value: number) {
  if (value <= 25) return 25;
  const step = Math.max(10, Math.ceil(value / 5 / 10) * 10);
  return Math.ceil(value / step) * step;
}

function buildParticipantTracks(
  points: ScoreEvolutionPoint[],
  matchPositions: Map<number, number>,
) {
  const tracks = new Map<string, ParticipantPointTrack>();

  for (const point of points) {
    const position = matchPositions.get(point.matchNumber);
    if (position === undefined) continue;

    const participantTrack = tracks.get(point.participantKey) ?? [];
    participantTrack.push({ point, position });
    tracks.set(point.participantKey, participantTrack);
  }

  for (const participantTrack of tracks.values()) {
    participantTrack.sort((left, right) => left.position - right.position);
  }

  return tracks;
}

function pointAtProgress({
  participant,
  track,
  progressIndex,
  matchCount,
}: {
  participant: ScoreEvolutionParticipant;
  track: ParticipantPointTrack;
  progressIndex: number;
  matchCount: number;
}) {
  if (track.length === 0) return null;

  const safeProgressIndex = clamp(progressIndex, 0, Math.max(0, matchCount - 1));
  const lower = findPointAtOrBefore(track, safeProgressIndex) ?? track[0];
  const upper = findPointAtOrAfter(track, safeProgressIndex) ?? lower;
  const span = Math.max(1, upper.position - lower.position);
  const fraction =
    upper.position === lower.position
      ? 0
      : clamp((safeProgressIndex - lower.position) / span, 0, 1);
  const totalPoints = lerp(lower.point.totalPoints, upper.point.totalPoints, fraction);
  const discretePoint = fraction > 0.985 ? upper.point : lower.point;

  return {
    point: {
      ...discretePoint,
      participantKey: participant.key,
      matchNumber: upper.point.matchNumber,
      matchIndex: upper.point.matchIndex,
      pointsInMatch: Math.max(0, upper.point.totalPoints - lower.point.totalPoints),
      totalPoints,
      previousRank: lower.point.rankAfterMatch,
      positionDelta: fraction < 0.001 ? discretePoint.positionDelta : 0,
    } satisfies ScoreEvolutionPoint,
    baseRank: lower.point.rankAfterMatch,
    fraction,
  };
}

function findPointAtOrBefore(track: ParticipantPointTrack, progressIndex: number) {
  for (let index = track.length - 1; index >= 0; index -= 1) {
    if (track[index].position <= progressIndex + 0.0001) return track[index];
  }
  return null;
}

function findPointAtOrAfter(track: ParticipantPointTrack, progressIndex: number) {
  for (const item of track) {
    if (item.position >= progressIndex - 0.0001) return item;
  }
  return null;
}

function pointToChartView({
  point,
  position,
  participant,
  matches,
  plotWidth,
  plotHeight,
  maxY,
  virtual = false,
}: {
  point: ScoreEvolutionPoint;
  position: number;
  participant: ScoreEvolutionParticipant;
  matches: ScoreEvolutionMatch[];
  plotWidth: number;
  plotHeight: number;
  maxY: number;
  virtual?: boolean;
}): ChartViewPoint {
  const match = matches[Math.min(Math.ceil(position), Math.max(0, matches.length - 1))];
  const x =
    PADDING.left +
    (position / Math.max(1, matches.length - 1)) * plotWidth;
  const y = PADDING.top + plotHeight - (point.totalPoints / maxY) * plotHeight;

  return {
    x,
    y,
    score: point,
    match,
    participant,
    virtual,
  };
}

function rankParticipantsAtProgress({
  participants,
  tracks,
  progressIndex,
  matchCount,
}: {
  participants: ScoreEvolutionParticipant[];
  tracks: Map<string, ParticipantPointTrack>;
  progressIndex: number;
  matchCount: number;
}): RankingSnapshotRow[] {
  const integerProgress =
    Math.abs(progressIndex - Math.round(progressIndex)) < 0.001;
  const rows: RankingSnapshotRow[] = [];

  for (const participant of participants) {
    const score = pointAtProgress({
      participant,
      track: tracks.get(participant.key) ?? [],
      progressIndex,
      matchCount,
    });

    if (!score) continue;

    rows.push({
      ...score.point,
      totalPoints: Math.round(score.point.totalPoints),
      participant,
      rank: 0,
      baseRank: score.baseRank,
      progressFraction: score.fraction,
    });
  }

  return rows
    .toSorted(
      (left, right) =>
        right.totalPoints - left.totalPoints ||
        right.exactScores - left.exactScores ||
        right.correctResults - left.correctResults ||
        left.participant.finalRank - right.participant.finalRank ||
        left.participant.name.localeCompare(right.participant.name, "pt-BR"),
    )
    .map((row, index) => {
      const rank = index + 1;
      const originalDelta =
        integerProgress && row.progressFraction < 0.001
          ? row.positionDelta
          : row.baseRank - rank;

      return {
        ...row,
        rank,
        rankAfterMatch: rank,
        positionDelta: originalDelta,
      };
    });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start: number, end: number, fraction: number) {
  return start + (end - start) * fraction;
}

function svgSafeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  );
}

function subscribeToReducedMotion(onStoreChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
