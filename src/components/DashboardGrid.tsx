import { useMemo } from "react";
import RGL, { WidthProvider, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Card } from "./ui";
import { IconX, IconGrip } from "./icons";
import { getWidget, type WidgetProps } from "./widgets/registry";
import type { PlacedWidget } from "../lib/dashboards";
import type { ProjectData } from "../lib/projectData";
import type { Project } from "../lib/projects";

const GridLayout = WidthProvider(RGL);
const COLS = 12;
const ROW_H = 108;
const MARGIN: [number, number] = [16, 16];

// Flow placed widgets left-to-right, wrapping at 12 columns.
function flow(items: { pw: PlacedWidget; i: number }[]): Layout[] {
  let x = 0, y = 0, rowH = 0;
  return items.map(({ pw, i }) => {
    const w = Math.min(COLS, Math.max(1, pw.w));
    const h = pw.h || 3;
    if (x + w > COLS) { x = 0; y += rowH; rowH = 0; }
    const item: Layout = { i: String(i), x, y, w, h };
    x += w; rowH = Math.max(rowH, h);
    return item;
  });
}

export default function DashboardGrid({
  widgets, d, project, editMode = false, onRemove, onLayoutChange,
}: {
  widgets: PlacedWidget[];
  d: ProjectData;
  project: Project;
  editMode?: boolean;
  onRemove?: (index: number) => void;
  onLayoutChange?: (layout: Layout[]) => void;
}) {
  // In edit mode show every widget; in view mode hide ones whose data is absent.
  const items = useMemo(
    () =>
      widgets
        .map((pw, i) => ({ pw, i }))
        .filter(({ pw }) => {
          const def = getWidget(pw.widgetId);
          return def && (editMode || !def.available || def.available(d));
        }),
    [widgets, d, editMode]
  );

  const layout = useMemo<Layout[]>(() => {
    const hasXY = items.length > 0 && items.every(({ pw }) => pw.x != null && pw.y != null);
    return hasXY
      ? items.map(({ pw, i }) => ({ i: String(i), x: pw.x!, y: pw.y!, w: pw.w, h: pw.h, minW: 2, minH: 1 }))
      : flow(items).map((l) => ({ ...l, minW: 2, minH: 1 }));
  }, [items]);

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={COLS}
      rowHeight={ROW_H}
      margin={MARGIN}
      containerPadding={[0, 0]}
      isDraggable={editMode}
      isResizable={editMode}
      draggableHandle=".drag-handle"
      compactType="vertical"
      onLayoutChange={(l) => editMode && onLayoutChange?.(l)}
    >
      {items.map(({ pw, i }) => {
        const def = getWidget(pw.widgetId)!;
        const props: WidgetProps = { d, project, config: pw.config };
        const Comp = def.component;

        if (editMode) {
          return (
            <div key={String(i)} className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
              <div className="drag-handle flex shrink-0 cursor-move items-center gap-1.5 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1.5">
                <IconGrip size={13} className="text-[var(--color-ink-3)]" />
                <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-[var(--color-ink-2)]">{def.title}</span>
                {onRemove && (
                  <button onClick={() => onRemove(i)} title="Remove" className="flex h-5 w-5 items-center justify-center rounded text-[var(--color-ink-3)] hover:bg-[var(--color-bad)] hover:text-white">
                    <IconX size={12} />
                  </button>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3">
                <Comp {...props} />
              </div>
            </div>
          );
        }

        const body = def.frame === "bare" ? (
          <div className="h-full">
            <Comp {...props} />
          </div>
        ) : (
          <Card className="flex h-full flex-col overflow-hidden">
            <h3 className="mb-2.5 shrink-0 text-[13px] font-semibold text-[var(--color-ink)]">{def.title}</h3>
            <div className="min-h-0 flex-1 overflow-auto">
              <Comp {...props} />
            </div>
          </Card>
        );
        return <div key={String(i)}>{body}</div>;
      })}
    </GridLayout>
  );
}
