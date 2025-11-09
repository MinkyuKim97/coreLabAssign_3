import { useState, useMemo, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import * as d3 from "d3";
import projectSchemes from "./projectData.json";

window.addEventListener("load", async () => {
  const root = createRoot(document.getElementById("root"));
  root.render(<Editor />);
});

function Editor() {
  const loadInitial = () => {
    try {
      const raw = localStorage.getItem("treeData_v1");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      name: projectSchemes?.name ?? "Root",
      date: projectSchemes?.date ?? "",
      time: projectSchemes?.time ?? "",
      value: projectSchemes?.value ?? "",
      children: projectSchemes?.children ?? [],
    };
  };
  const initial = loadInitial();

  const [projectName, setProjectName] = useState(initial.name);
  const [rootMeta, setRootMeta] = useState({
    date: initial.date ?? "",
    time: initial.time ?? "",
    value: initial.value ?? "",
  });
  const [children, setChildren] = useState(initial.children ?? []);
  useEffect(() => {
    const data = { name: projectName, ...rootMeta, children };
    localStorage.setItem("treeData_v1", JSON.stringify(data));
  }, [projectName, rootMeta, children]);

  const [nodeGapY, setNodeGapY] = useState(50);
  const [nodeGapX, setNodeGapX] = useState(300);
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarVW, setSidebarVW] = useState(20);

  const viewportRef = useRef(null);
  const isPanningRef = useRef(false);
  const panRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const initialCenterRef = useRef({ left: 0, top: 0 });
  const hasAutoCenteredRef = useRef(false);

  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 3.0;
  const gestureRef = useRef({ startZoom: 1 });
  const isPointerOverViewportRef = useRef(false);

  const [vpSize, setVpSize] = useState({ w: 0, h: 0 });
  const measureViewport = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    setVpSize({ w: vp.clientWidth, h: vp.clientHeight });
  };
  useEffect(() => {
    measureViewport();
    window.addEventListener("resize", measureViewport);
    return () => window.removeEventListener("resize", measureViewport);
  }, []);
  useEffect(() => {
    requestAnimationFrame(measureViewport);
  }, [sidebarOpen, sidebarVW]);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const parsePathToIndices = (id) =>
    (id ?? "")
      .split(".")
      .slice(1)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));

  const addChildImmutable = (arr, indices, newChild) => {
    if (!Array.isArray(arr)) arr = [];
    if (indices.length === 0) return [...arr, newChild];
    const [i, ...rest] = indices;
    if (i < 0 || i >= arr.length) return arr;
    return arr.map((child, idx) => {
      if (idx !== i) return child;
      const nextChildren = addChildImmutable(
        child.children ?? [],
        rest,
        newChild
      );
      return { ...child, children: nextChildren };
    });
  };

  const updateNodeImmutable = (arr, indices, patch) => {
    if (!Array.isArray(arr)) return arr;
    if (indices.length === 0) return arr;
    const [i, ...rest] = indices;
    if (i < 0 || i >= arr.length) return arr;
    return arr.map((child, idx) => {
      if (idx !== i) return child;
      if (rest.length === 0) {
        return { ...child, ...patch };
      } else {
        const nextChildren = updateNodeImmutable(
          child.children ?? [],
          rest,
          patch
        );
        return { ...child, children: nextChildren };
      }
    });
  };

  const removeNodeImmutable = (arr, indices) => {
    if (!Array.isArray(arr)) return arr;
    if (indices.length === 0) return arr;
    const [i, ...rest] = indices;
    if (i < 0 || i >= arr.length) return arr;
    if (rest.length === 0) {
      return arr.filter((_, idx) => idx !== i);
    } else {
      return arr.map((child, idx) => {
        if (idx !== i) return child;
        const nextChildren = removeNodeImmutable(child.children ?? [], rest);
        return { ...child, children: nextChildren };
      });
    }
  };

  const handleAddChildAt = (nodeId) => {
    const indices = parsePathToIndices(nodeId);
    const newChild = {
      name: "New",
      date: "",
      time: "",
      value: "",
      children: [],
    };
    setChildren((prev) => addChildImmutable(prev, indices, newChild));
  };

  const handleDeleteNode = (nodeId) => {
    if (nodeId === "r") return;
    const indices = parsePathToIndices(nodeId);
    setChildren((prev) => removeNodeImmutable(prev, indices));
    setSelectedId(null);
  };

  const setNodeField = (nodeId, field, value) => {
    if (nodeId === "r") {
      if (field === "name") setProjectName(value);
      else setRootMeta((m) => ({ ...m, [field]: value }));
      return;
    }
    const indices = parsePathToIndices(nodeId);
    setChildren((prev) =>
      updateNodeImmutable(prev, indices, { [field]: value })
    );
  };

  const layout = useMemo(() => {
    const root = d3.hierarchy({ name: projectName, ...rootMeta, children });
    root.id = "r";
    root.eachBefore((n) => {
      if (n.parent?.children) {
        const i = n.parent.children.indexOf(n);
        n.id = `${n.parent.id}.${i}`;
      }
    });
    const tree = d3
      .tree()
      .nodeSize([nodeGapY, nodeGapX])
      .separation((a, b) => (a.parent === b.parent ? 1.8 : 3.0));
    const laid = tree(root);
    const nodes = laid.descendants();
    const links = laid.links();
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y));
    const pad = 48;
    const contentW = maxY - minY + pad * 2;
    const contentH = maxX - minX + pad * 2;
    const baseX = (n) => n.y - minY + pad;
    const baseY = (n) => n.x - minX + pad;
    const rootNode = nodes.find((n) => n.depth === 0) ?? nodes[0];
    const nodeIndex = new Map(nodes.map((n) => [n.id, n]));
    return {
      nodes,
      links,
      contentW,
      contentH,
      baseX,
      baseY,
      rootNode,
      nodeIndex,
      root,
    };
  }, [projectName, rootMeta, children, nodeGapY, nodeGapX]);

  const stagePadX = Math.max(0, Math.round(vpSize.w * 0.5));
  const stagePadY = Math.max(0, Math.round(vpSize.h * 0.5));
  const stageW = layout.contentW + stagePadX * 2;
  const stageH = layout.contentH + stagePadY * 2;
  const stageOuterW = stageW * zoom;
  const stageOuterH = stageH * zoom;

  const stageX = (n) => stagePadX + layout.baseX(n);
  const stageY = (n) => stagePadY + layout.baseY(n);
  const scaledX = (n, atZoom = zoom) => atZoom * stageX(n);
  const scaledY = (n, atZoom = zoom) => atZoom * stageY(n);

  const clampScroll = (vp, left, top, atZoom) => {
    const maxL = Math.max(0, stageW * atZoom - vp.clientWidth);
    const maxT = Math.max(0, stageH * atZoom - vp.clientHeight);
    return { left: clamp(left, 0, maxL), top: clamp(top, 0, maxT) };
  };

  const centerToNode = (node, opts = { behavior: "auto" }) => {
    const vp = viewportRef.current;
    if (!vp || !node) return;
    const x = scaledX(node);
    const y = scaledY(node);
    const { left, top } = clampScroll(
      vp,
      x - vp.clientWidth / 2,
      y - vp.clientHeight / 2,
      zoom
    );
    vp.scrollTo({ left, top, behavior: opts.behavior });
    initialCenterRef.current = { left, top };
  };

  const centerToNodeAtZoom = (node, targetZoom = 1.6, behavior = "smooth") => {
    const vp = viewportRef.current;
    if (!vp || !node) return;
    const tz = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
    const x = scaledX(node, tz);
    const y = scaledY(node, tz);
    const { left, top } = clampScroll(
      vp,
      x - vp.clientWidth / 2,
      y - vp.clientHeight / 2,
      tz
    );
    setZoom(tz);
    requestAnimationFrame(() => {
      vp.scrollTo({ left, top, behavior });
      initialCenterRef.current = { left, top };
    });
  };

  useEffect(() => {
    if (hasAutoCenteredRef.current) return;
    if (vpSize.w === 0 || vpSize.h === 0) return;
    centerToNode(layout.rootNode);
    hasAutoCenteredRef.current = true;
  }, [vpSize.w, vpSize.h, layout.rootNode]);

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    if (
      e.target.closest(".node-card") ||
      e.target.closest(".side-panel") ||
      e.target.closest(".panel-toggle")
    )
      return;
    setSelectedId(null);
    const vp = viewportRef.current;
    if (!vp) return;
    isPanningRef.current = true;
    panRef.current.startX = e.clientX;
    panRef.current.startY = e.clientY;
    panRef.current.startLeft = vp.scrollLeft;
    panRef.current.startTop = vp.scrollTop;
    e.preventDefault();
  };
  const onMouseMove = (e) => {
    if (!isPanningRef.current) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    vp.scrollLeft = panRef.current.startLeft - dx;
    vp.scrollTop = panRef.current.startTop - dy;
  };
  const endPan = () => {
    isPanningRef.current = false;
  };

  const clampZoom = (z) => clamp(z, MIN_ZOOM, MAX_ZOOM);

  const zoomAroundPointer = (clientX, clientY, factor) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const prev = zoom;
    const next = clampZoom(prev * factor);
    if (next === prev) return;
    const rect = vp.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const offsetX = vp.scrollLeft + screenX;
    const offsetY = vp.scrollTop + screenY;
    const contentX = offsetX / prev;
    const contentY = offsetY / prev;
    const newOffsetX = contentX * next;
    const newOffsetY = contentY * next;
    const { left, top } = clampScroll(
      vp,
      newOffsetX - screenX,
      newOffsetY - screenY,
      next
    );
    setZoom(next);
    requestAnimationFrame(() => {
      vp.scrollLeft = left;
      vp.scrollTop = top;
    });
  };

  const onWheel = (e) => {
    const isPinch = e.ctrlKey || e.metaKey;
    const wantsMouseZoom = e.shiftKey;
    if (isPinch || wantsMouseZoom) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      zoomAroundPointer(e.clientX, e.clientY, factor);
    }
  };

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onGestureStart = (e) => {
      if (!isPointerOverViewportRef.current) return;
      e.preventDefault();
      gestureRef.current.startZoom = zoom;
    };
    const onGestureChange = (e) => {
      if (!isPointerOverViewportRef.current) return;
      e.preventDefault();
      const targetZoom = clampZoom(gestureRef.current.startZoom * e.scale);
      const factor = targetZoom / zoom;
      const rect = vp.getBoundingClientRect();
      const cx = rect.left + vp.clientWidth / 2;
      const cy = rect.top + vp.clientHeight / 2;
      zoomAroundPointer(cx, cy, factor);
    };
    const onGestureEnd = (e) => {
      if (!isPointerOverViewportRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("gesturestart", onGestureStart, { passive: false });
    window.addEventListener("gesturechange", onGestureChange, {
      passive: false,
    });
    window.addEventListener("gestureend", onGestureEnd, { passive: false });
    return () => {
      window.removeEventListener("gesturestart", onGestureStart);
      window.removeEventListener("gesturechange", onGestureChange);
      window.removeEventListener("gestureend", onGestureEnd);
    };
  }, [zoom]);

  const resetView = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    const targetZoom = 1;
    const x = scaledX(layout.rootNode, targetZoom);
    const y = scaledY(layout.rootNode, targetZoom);
    const { left, top } = clampScroll(
      vp,
      x - vp.clientWidth / 2,
      y - vp.clientHeight / 2,
      targetZoom
    );
    setZoom(targetZoom);
    requestAnimationFrame(() => {
      vp.scrollTo({ left, top, behavior: "smooth" });
      initialCenterRef.current = { left, top };
    });
  };

  const jumpToNodeId = (id) => {
    const node = layout.nodeIndex.get(id);
    if (!node) return;
    setSelectedId(null);
    centerToNodeAtZoom(node, 1.6, "smooth");
  };


  const resetToJSON = () => {
    try {
      localStorage.removeItem('treeData_v1');
    } catch {}
    location.reload();
  };

  const SideTree = ({ node }) => {
    const clickable = {
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid transparent",
      background: "transparent",
      cursor: "pointer",
      fontSize: 13,
    };
    const clickableHover = `
      .side-tree button:hover {
        background: #f3f4f6;
        border-color: #e5e7eb;
      }
    `;
    return (
      <div
        className="side-tree"
        style={{ marginLeft: node.depth * 12, marginBottom: 4 }}
      >
        <style>{clickableHover}</style>
        <button
          onClick={() => jumpToNodeId(node.id)}
          style={clickable}
          title={`Go to "${node.data?.name}"`}
        >
          {node.data?.name ?? "(unnamed)"}{" "}
          <span style={{ color: "#888" }}>
            {Array.isArray(node.children) ? `(${node.children.length})` : ""}
          </span>
        </button>
        {Array.isArray(node.children) &&
          node.children.map((c) => <SideTree key={c.id} node={c} />)}
      </div>
    );
  };

  const downloadJSON = () => {
    const data = { name: projectName, ...rootMeta, children };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projectData.updated.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="editor"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#fafafa",
        display: "flex",
        margin: 0,
      }}
    >
      <style>{`
        .side-panel { scrollbar-width: none; -ms-overflow-style: none; }
        .side-panel::-webkit-scrollbar { display: none; }
      `}</style>

      {sidebarOpen ? null : (
        <button
          className="panel-toggle"
          onClick={() => setSidebarOpen(true)}
          style={{
            position: "fixed",
            left: 8,
            top: 8,
            zIndex: 1000,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #000000",
            background: "#fff",
            cursor: "pointer",
          }}
          title="Show panel"
        >
          Show Panel
        </button>
      )}

      {sidebarOpen && (
        <aside
          className="side-panel"
          style={{
            position: "relative",
            width: `${sidebarVW}vw`,
            minWidth: 240,
            maxWidth: 560,
            height: "100%",
            background: "#ffffff",
            borderRight: "1px solid #e5e5e5",
            boxShadow: "0 0 24px rgba(0,0,0,0.03)",
            padding: 12,
            paddingBottom: 48,
            overflowY: "auto",
            zIndex: 2,
          }}
        >
          <button
            className="panel-toggle"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "absolute",
              top: 8,
              right: 10,
              transform: "translateX(0)",
              zIndex: 3,
              padding: "6px 10px",
              borderRadius: 8,
            border: "1px solid #000000",
                background: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            title="Hide panel"
          >
            Hide Panel
          </button>

          <div style={{ marginBottom: 16, marginTop: 36 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
              Panel width
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                type="range"                
                min={12}
                max={30}
                step={1}
                value={sidebarVW}
                onChange={(e) => setSidebarVW(Number(e.target.value))}
              />

            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
              Y Height
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={50}
                max={300}
                step={5}
                value={nodeGapY}
                onChange={(e) => setNodeGapY(Number(e.target.value))}
              />

            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 6 }}>
              X Width
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min={300}
                max={600}
                step={10}
                value={nodeGapX}
                onChange={(e) => setNodeGapX(Number(e.target.value))}
              />

            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              className="panelBtn"
              onClick={resetView}
              style={{
                padding: "6px 10px",
                // borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "white",
                cursor: "pointer",
              }}
            >
              Root center
            </button>

            <button
              className="panelBtn"
              onClick={downloadJSON}
              style={{
                padding: "6px 10px",
                // borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "white",
                cursor: "pointer",
              }}
              title="Download current JSON"
            >
              Export JSON
            </button>

            <button
              className="panelBtn"
              onClick={resetToJSON}
              style={{
                padding: "6px 10px",
                // borderRadius: 6,
                border: "1px solid rgba(0,0,0,0.2)",
                background: "#fff8f8",
                cursor: "pointer",
              }}
              title="Clear localStorage and reload from projectData.json"
            >
              Fetch JSON
            </button>
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#333",
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {/* Hierarchy */}
          </div>
          <div style={{ fontSize: 13 }}>
            <SideTree node={layout.root} />
          </div>
        </aside>
      )}

      <div
        ref={viewportRef}
        className="viewport"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endPan}
        onMouseLeave={(e) => {
          endPan();
          isPointerOverViewportRef.current = false;
        }}
        onMouseEnter={() => {
          isPointerOverViewportRef.current = true;
        }}
        onWheel={onWheel}
        style={{
          flex: 1,
          position: "relative",
          overflow: "auto",
          cursor: isPanningRef.current ? "grabbing" : "grab",
          userSelect: isPanningRef.current ? "none" : "auto",
          zIndex: 1,
        }}
      >

        <div
          className="stage"
          style={{
            position: "relative",
            width: stageOuterW,
            height: stageOuterH,
            margin: "0 auto",
            background: "#fafafa",
          }}
        >
          <div
            className="stage-inner"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: stageW,
              height: stageH,
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <svg
              width={stageW}
              height={stageH}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                pointerEvents: "none",
              }}
            >
              {layout.links.map((link, i) => {
                const pathGen = d3
                  .linkHorizontal()
                  .x((d) => stageX(d))
                  .y((d) => stageY(d));
                return (
                  <path
                    key={i}
                    d={pathGen({ source: link.source, target: link.target })}
                    fill="none"
                    stroke="#c0c0c0"
                    strokeWidth={1.5}
                  />
                );
              })}
            </svg>

            {layout.nodes.map((n) => (
              <div
                key={n.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(n.id);
                }}
                style={{
                  position: "absolute",
                  left: stageX(n),
                  top: stageY(n),
                  transform: "translate(-50%, -50%)",
                }}
              >
                <NodeCard
                  id={n.id}
                  selected={selectedId === n.id}
                  name={n.data?.name}
                  date={n.data?.date}
                  time={n.data?.time}
                  value={n.data?.value}
                  onAddChild={() => handleAddChildAt(n.id)}
                  onChangeField={(field, val) => setNodeField(n.id, field, val)}
                  onDelete={() => handleDeleteNode(n.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeCard({
  id,
  selected,
  name,
  date,
  time,
  value,
  onAddChild,
  onChangeField,
  onDelete,
}) {
  const HOVER_MAX = 560;
  const base = {
    background: "#fff",
    borderRadius: 10,
    border: selected ? "1px solid #757575ff" : "1px solid rgba(0, 0, 0, 1)",
    boxShadow: selected
      ? "0 6px 18px rgba(59,130,246,0.25)"
      : "0 1px 3px rgba(0,0,0,0.06)",
    display: "inline-block",
    textAlign: "left",
    userSelect: "none",
    position: "relative",
    padding: "10px 14px",
    lineHeight: 1.35,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    whiteSpace: "normal",
    maxWidth: selected ? HOVER_MAX : undefined,
    cursor: "pointer",
    transition: "all 0.3s ease-in-out",
  };
  const plusBtn = {
    position: "absolute",
    right: -35,
    top: "50%",
    transform: "translateY(-50%)",
    width: 28,
    height: 28,
    borderRadius: 14,
    border: "1px solid rgba(0, 0, 0, 1)",
    background: "white",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: "26px",
    padding: 0,
    zIndex: 5,
  };
  const closeBtn = {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "white",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: "22px",
    padding: 0,
    zIndex: 6,
  };
  const stop = (e) => e.stopPropagation();

  return (
    <div className="nodeCardCover">
      <div className={`node-card ${selected ? "selected" : ""}`} style={base}>
        <style>{`
        .node-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.16);}
        .node-card .details-inline { display: none; }
        .node-card .details-inline:empty {
          display: none !important;
          max-width: none;
        }
        .node-card:hover .details-inline { display: block; }
        .node-card.selected .details-inline { display: inline; }
        .node-card .title-static {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          font-weight: 700;
          font-size: 14px;
          margin-right: 12px;
        }
        .node-card .title-input {
          font-weight: 700;
          font-size: 14px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 4px 8px;
          width: 100%;
          box-sizing: border-box;
        }
        .node-card .text-input {
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 6px 8px;
          width: 100%;
          box-sizing: border-box;
          font-size: 12px;
          height: fit-content;
        }
        .node-card .description-input {
          height: 100px;
        }
          
        .node-card .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .node-card .label { font-size: 12px; color: #555; margin-bottom: 4px; display: block; }
      `}</style>

        {selected ? (
          <input
            className="title-input"
            value={name ?? ""}
            onChange={(e) => onChangeField("name", e.target.value)}
            onClick={stop}
          />
        ) : (
          <div className="title-static">{name}</div>
        )}

        {selected && (
          <button
            onClick={(e) => {
              stop(e);
              onDelete();
            }}
            style={closeBtn}
            title="Delete node"
            aria-label="Delete node"
          >
            ×
          </button>
        )}


        <div
          className="details-inline"
          style={{
            marginTop: 6,
            width: "250px",
          }}
        >
          {selected ? (
            <>
              <div className="row">
                <div>
                  <span className="label">Date</span>
                  <input
                    className="text-input"
                    value={date ?? ""}
                    onChange={(e) => onChangeField("date", e.target.value)}
                    onClick={stop}
                    placeholder="MM-DD-YYYY"
                  />
                </div>
                <div>
                  <span className="label">Time</span>
                  <input
                    className="text-input"
                    value={time ?? ""}
                    onChange={(e) => onChangeField("time", e.target.value)}
                    onClick={stop}
                    placeholder="HH:MM (24)"
                  />
                </div>
              </div>
              <div style={{ marginTop: 8}}>
                <span className="label">Description</span>
                <textarea
                  className="text-input description-input"
                  rows={3}
                  value={value ?? ""}
                  onChange={(e) => onChangeField("value", e.target.value)}
                  onClick={stop}
                  placeholder="Project details"
                  style={{ resize: "vertical" }}
                />
              </div>
            </>
          ) : (
            <>
              {date && (
                <div style={{ fontSize: 12, marginBottom: 2 }}>
                  <b>Date:</b> {date}{" "}
                </div>
              )}
              {time && (
                <div style={{ fontSize: 12, marginBottom: 2 }}>
                  <b>Time:</b> {time}
                </div>
              )}
              {value && (
                <div style={{ fontSize: 12, marginBottom: 2 }}>
                  <b>Description:</b> {value}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <button
        onClick={(e) => {
          stop(e);
          onAddChild();
        }}
        style={plusBtn}
        title={`Add child to "${name}"`}
        aria-label="Add child"
      >
        +
      </button>
    </div>
  );
}

export default Editor;
