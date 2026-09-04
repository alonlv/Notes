"use client";

/**
 * The memory store drawn as a graph.
 *
 * The list view answers "what do you remember?"; this answers "how does it hang
 * together?" — which memories the assistant has grouped into the same context,
 * and why any two of them are linked. Clusters come from the backend (Louvain
 * over the weighted edges); everything here is presentation.
 *
 * Rendering is react-force-graph-2d: a canvas-based d3-force layout that stays
 * smooth on a phone at the scale a personal memory store reaches, and needs no
 * WebGL. It is loaded lazily and client-side only — it touches `window` on
 * import, so it can never be part of the server bundle.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Network, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/context/theme-context";
import type { MemoryGraph as MemoryGraphData, MemoryGraphNode, MemoryLinkKind } from "@/types/api";

/** What a link means, in words a person can read. Mirrors EDGE_LABELS on the backend. */
const LINK_LABEL: Record<MemoryLinkKind, string> = {
  semantic: "similar meaning",
  topic: "same topic",
  entity: "mentions the same thing",
};

const LINK_COLOR: Record<MemoryLinkKind, string> = {
  semantic: "#60a5fa",
  topic: "#34d399",
  entity: "#fbbf24",
};

/** One hue per context. Clusters are numbered by size, so the biggest is stable. */
const CLUSTER_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
  "#14b8a6", "#ef4444", "#6366f1", "#84cc16", "#f97316",
];
const UNCLUSTERED_COLOR = "#94a3b8";

/** Exported so the list view colours a context the same way the map does — one
 *  store, two pictures, and the same subject is the same colour in both. */
export function clusterColor(cluster: number): string {
  return cluster < 0 ? UNCLUSTERED_COLOR : CLUSTER_COLORS[cluster % CLUSTER_COLORS.length];
}

// The force layout writes x/y onto the nodes it is given, and rewrites each
// link's source/target from an id into the node object itself — so it gets a
// copy, and the query data stays clean for everything else on the page.
type PositionedNode = MemoryGraphNode & { x?: number; y?: number };
type PositionedLink = { source: string | PositionedNode; target: string | PositionedNode; kind: MemoryLinkKind; weight: number };

interface ForceGraphProps {
  graphData: { nodes: PositionedNode[]; links: PositionedLink[] };
  width: number;
  height: number;
  backgroundColor: string;
  cooldownTicks: number;
  nodeRelSize: number;
  nodeCanvasObject: (node: PositionedNode, ctx: CanvasRenderingContext2D, scale: number) => void;
  nodePointerAreaPaint: (node: PositionedNode, color: string, ctx: CanvasRenderingContext2D) => void;
  linkColor: (link: PositionedLink) => string;
  linkWidth: (link: PositionedLink) => number;
  onNodeClick: (node: PositionedNode) => void;
  onBackgroundClick: () => void;
  onNodeHover: (node: PositionedNode | null) => void;
  onEngineStop: () => void;
  enableNodeDrag: boolean;
  ref?: React.Ref<ForceGraphHandle | null>;
}

/** The slice of the library's imperative API this component drives. */
interface ForceGraphHandle {
  zoomToFit: (durationMs?: number, padding?: number) => void;
}

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-lg bg-muted" />,
}) as unknown as ComponentType<ForceGraphProps>;

/** Read a link endpoint whether the layout has resolved it to a node yet or not. */
function endpointId(end: string | PositionedNode): string {
  return typeof end === "string" ? end : end.id;
}

/** Node size reads as "how connected is this?" — a hub is visibly a hub. */
function nodeRadius(node: MemoryGraphNode): number {
  return 3.5 + Math.min(5.5, node.degree * 0.7);
}

export function MemoryGraph({
  data,
  onOpenMemory,
}: {
  data: MemoryGraphData;
  onOpenMemory?: (id: string) => void;
}) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusCluster, setFocusCluster] = useState<number | null>(null);
  const graphRef = useRef<ForceGraphHandle | null>(null);
  // The layout settles more than once; only the first settle should move the
  // camera, or a later tick would yank the view back from wherever the user
  // panned to.
  const fitted = useRef(false);

  // The canvas needs pixel dimensions, and the panel it lives in is fluid.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A fresh copy per payload: the layout mutates whatever it is handed.
  const graphData = useMemo(() => {
    fitted.current = false;
    return {
      nodes: data.nodes.map((node) => ({ ...node })),
      links: data.links.map((link) => ({ ...link })),
    };
  }, [data]);

  const nodesById = useMemo(
    () => new Map(data.nodes.map((node) => [node.id, node])),
    [data.nodes]
  );

  // What the selected memory is linked to, and why. Derived from the links already
  // on screen, so the panel and the picture can never disagree.
  const connections = useMemo(() => {
    if (!selectedId) return [];
    const merged = new Map<string, { node: MemoryGraphNode; kinds: MemoryLinkKind[]; weight: number }>();
    for (const link of data.links) {
      const from = endpointId(link.source);
      const to = endpointId(link.target);
      if (from !== selectedId && to !== selectedId) continue;
      const otherId = from === selectedId ? to : from;
      const node = nodesById.get(otherId);
      if (!node) continue;
      const entry = merged.get(otherId) ?? { node, kinds: [], weight: 0 };
      entry.kinds.push(link.kind);
      entry.weight += link.weight;
      merged.set(otherId, entry);
    }
    return [...merged.values()].sort((a, b) => b.weight - a.weight);
  }, [selectedId, data.links, nodesById]);

  // One context label per cluster, parked on its most connected member. Labelling
  // every node at once is unreadable; labelling none leaves a picture of dots that
  // says nothing until you click it.
  const contextAnchors = useMemo(() => {
    const anchors = new Map<number, string>();
    const best = new Map<number, number>();
    for (const node of data.nodes) {
      if (node.cluster < 0 || !node.cluster_label) continue;
      if (node.degree > (best.get(node.cluster) ?? -1)) {
        best.set(node.cluster, node.degree);
        anchors.set(node.cluster, node.id);
      }
    }
    return new Set(anchors.values());
  }, [data.nodes]);

  const selected = selectedId ? nodesById.get(selectedId) ?? null : null;
  const highlighted = useMemo(
    () => new Set(connections.map((c) => c.node.id)),
    [connections]
  );

  const dimmed = useCallback(
    (node: PositionedNode) => focusCluster !== null && node.cluster !== focusCluster,
    [focusCluster]
  );

  const textColor = theme === "dark" ? "#e2e8f0" : "#1e293b";
  const background = theme === "dark" ? "#0b1220" : "#f8fafc";

  const paintNode = useCallback(
    (node: PositionedNode, ctx: CanvasRenderingContext2D, scale: number) => {
      const { x = 0, y = 0 } = node;
      const isSelected = node.id === selectedId;
      const isNeighbour = highlighted.has(node.id);
      const faded = dimmed(node) || (selectedId !== null && !isSelected && !isNeighbour);
      // Size reads as "how connected is this?" — a hub is visibly a hub.
      const radius = nodeRadius(node);

      ctx.globalAlpha = faded ? 0.25 : 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = clusterColor(node.cluster);
      ctx.fill();

      if (isSelected || node.id === hoveredId) {
        ctx.lineWidth = 2 / scale;
        ctx.strokeStyle = textColor;
        ctx.stroke();
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      // Read the memory itself only when there is room — zoomed in, or pointed at.
      if (scale > 1.6 || isSelected || node.id === hoveredId) {
        const label = node.content.length > 42 ? `${node.content.slice(0, 42)}…` : node.content;
        ctx.font = `${11 / scale}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.fillText(label, x, y + radius + 2 / scale);
      } else if (contextAnchors.has(node.id)) {
        // Zoomed out, the map should still say what each region is about.
        ctx.font = `600 ${12 / scale}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillStyle = clusterColor(node.cluster);
        ctx.fillText(node.cluster_label, x, y + radius + 3 / scale);
      }
      ctx.globalAlpha = 1;
    },
    [selectedId, hoveredId, highlighted, dimmed, textColor, contextAnchors]
  );

  const paintPointerArea = useCallback(
    (node: PositionedNode, color: string, ctx: CanvasRenderingContext2D) => {
      const { x = 0, y = 0 } = node;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius(node) + 2, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  const linkColor = useCallback(
    (link: PositionedLink) => {
      const base = LINK_COLOR[link.kind] ?? UNCLUSTERED_COLOR;
      if (!selectedId) return `${base}88`;
      const touches = endpointId(link.source) === selectedId || endpointId(link.target) === selectedId;
      return touches ? base : `${base}22`;
    },
    [selectedId]
  );

  const linkWidth = useCallback((link: PositionedLink) => 0.5 + link.weight * 2, []);

  if (!data.nodes.length) {
    return (
      <div className="rounded-lg border border-border py-16 text-center text-muted-foreground">
        <Network className="mx-auto mb-2 h-8 w-8 opacity-30" />
        <p className="text-sm">No memories to map yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {data.stats.memories} memories · {data.stats.links} links · {data.stats.clusters} contexts
        {data.stats.unlinked > 0 && ` · ${data.stats.unlinked} unconnected`}
      </p>

      {data.clusters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-xs text-muted-foreground">Contexts</span>
          {data.clusters.map((cluster) => (
            <button
              key={cluster.id}
              onClick={() => setFocusCluster((current) => (current === cluster.id ? null : cluster.id))}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs capitalize transition-colors ${
                focusCluster === cluster.id
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: clusterColor(cluster.id) }}
              />
              {cluster.label || `context ${cluster.id + 1}`}
              <span className="text-muted-foreground/60">{cluster.size}</span>
            </button>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="h-[380px] w-full overflow-hidden rounded-lg border border-border md:h-[520px]"
      >
        {size.width > 0 && (
          <ForceGraph2D
            graphData={graphData}
            width={size.width}
            height={size.height}
            backgroundColor={background}
            cooldownTicks={120}
            nodeRelSize={4}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={paintPointerArea}
            linkColor={linkColor}
            linkWidth={linkWidth}
            onNodeClick={(node) => setSelectedId(node.id)}
            onBackgroundClick={() => setSelectedId(null)}
            onNodeHover={(node) => setHoveredId(node?.id ?? null)}
            onEngineStop={() => {
              if (fitted.current) return;
              fitted.current = true;
              graphRef.current?.zoomToFit(400, 40);
            }}
            enableNodeDrag={false}
            ref={graphRef}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
        {(Object.keys(LINK_LABEL) as MemoryLinkKind[]).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: LINK_COLOR[kind] }} />
            {LINK_LABEL[kind]}
          </span>
        ))}
        {!selectedId && (
          <span className="text-muted-foreground/70">
            Tap a memory to see what it connects to · scroll to zoom in and read them
          </span>
        )}
      </div>

      {selected && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm">{selected.content}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {/* The context is usually named after a topic the memory already
                    shows; only worth its own badge when it says something new. */}
                {selected.cluster_label && !selected.topics.includes(selected.cluster_label) && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {selected.cluster_label}
                  </Badge>
                )}
                {selected.topics.map((topic) => (
                  <Badge key={topic} variant="outline" className="text-xs capitalize">
                    #{topic}
                  </Badge>
                ))}
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 border-t border-border pt-3">
            {connections.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nothing else connects to this one yet.
              </p>
            ) : (
              <>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Connected to {connections.length}{" "}
                  {connections.length === 1 ? "memory" : "memories"}
                </p>
                <ul className="space-y-1.5">
                  {connections.map(({ node, kinds }) => (
                    <li key={node.id}>
                      <button
                        onClick={() => setSelectedId(node.id)}
                        className="w-full text-left text-xs hover:text-primary"
                      >
                        {node.content}
                        <span className="text-muted-foreground/70">
                          {" — "}
                          {[...new Set(kinds)].map((kind) => LINK_LABEL[kind]).join(", ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {onOpenMemory && (
            <button
              onClick={() => onOpenMemory(selected.id)}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Show in list
            </button>
          )}
        </div>
      )}
    </div>
  );
}
