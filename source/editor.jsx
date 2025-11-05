// Editor.jsx
import { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import * as d3 from "d3";
import projectSchemes from "./projectData.json";

window.addEventListener("load", async () => {
  const root = createRoot(document.getElementById("root"));
  root.render(<Editor />);
});

function Editor() {
  const [projectName, setProjectName] = useState(projectSchemes?.name ?? "Root");
  const [children, setChildren] = useState(projectSchemes?.children ?? []);

  // 경로 id r.0.1 → [0,1]
  const parsePathToIndices = (id) =>
    (id ?? "")
      .split(".")
      .slice(1)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));

  // 불변 업데이트로 경로에 자식 추가
  const addChildImmutable = (arr, indices, newChild) => {
    if (!Array.isArray(arr)) arr = [];
    if (indices.length === 0) return [...arr, newChild];
    const [i, ...rest] = indices;
    if (i < 0 || i >= arr.length) return arr;
    return arr.map((child, idx) => {
      if (idx !== i) return child;
      const nextChildren = addChildImmutable(child.children ?? [], rest, newChild);
      return { ...child, children: nextChildren };
    });
  };

  const handleAddChildAt = (nodeId) => {
    const indices = parsePathToIndices(nodeId);
    const newChild = {
      name: "New Project",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toTimeString().slice(0, 5),
      value: "Description here",
      children: [],
    };
    setChildren((prev) => addChildImmutable(prev, indices, newChild));
  };

  // D3 트리 + 경로 기반 ID(r.0.1...)
  const layout = useMemo(() => {
    const root = d3.hierarchy({ name: projectName, children });

    root.id = "r";
    root.eachBefore((n) => {
      if (n.parent?.children) {
        const i = n.parent.children.indexOf(n);
        n.id = `${n.parent.id}.${i}`;
      }
    });

    // 간격 넓게
    const tree = d3
      .tree()
      // .nodeSize([140, 360])
      .nodeSize([50, 300])
      .separation((a, b) => (a.parent === b.parent ? 1.8 : 3.0));

    const laid = tree(root);
    const nodes = laid.descendants();
    const links = laid.links();

    // 스테이지 크기
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x));
    const minY = Math.min(...nodes.map((n) => n.y));
    const maxY = Math.max(...nodes.map((n) => n.y));
    const pad = 48;

    const contentW = maxY - minY + pad * 2;
    const contentH = maxX - minX + pad * 2;

    const toStageX = (n) => n.y - minY + pad; // left
    const toStageY = (n) => n.x - minX + pad; // top

    return { nodes, links, contentW, contentH, toStageX, toStageY };
  }, [projectName, children]);

  return (
    <div
      id="editor"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "#fafafa",
      }}
    >
      {/* 전체 화면 트리 뷰포트 */}
      <div className="viewport" style={{ position: "absolute", inset: 0, overflow: "auto", zIndex: 0 }}>
        <div
          className="stage"
          style={{ position: "relative", width: layout.contentW, height: layout.contentH, margin: "0 auto" }}
        >
          {/* 링크 (클릭 방지) */}
          <svg
            width={layout.contentW}
            height={layout.contentH}
            style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
          >
            {layout.links.map((link, i) => {
              const pathGen = d3.linkHorizontal().x((d) => layout.toStageX(d)).y((d) => layout.toStageY(d));
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

          {/* 노드 (절대 배치) */}
          {layout.nodes.map((n) => (
            <div
              key={n.id}
              style={{
                position: "absolute",
                left: layout.toStageX(n),
                top: layout.toStageY(n),
                transform: "translate(-50%, -50%)",
              }}
            >
              <NodeCard
                id={n.id}
                name={n.data?.name}
                date={n.data?.date}
                time={n.data?.time}
                value={n.data?.value}
                childCount={Array.isArray(n.data?.children) ? n.data.children.length : 0}
                onAddChild={() => handleAddChildAt(n.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 루트 이름 입력 */}
      <div
        className="controls"
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          background: "white",
          border: "1px solid #e5e5e5",
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          padding: 12,
          width: 320,
        }}
      >
        <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 6 }}>Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>
    </div>
  );
}

function NodeCard({ id, name, date, time, value, childCount, onAddChild }) {
  const base = {
    background: "#fff",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    // ✅ 폭 고정 & 자동 줄바꿈
    width: 240,
    minWidth: 240,
    maxWidth: 240,
    textAlign: "left",
    userSelect: "none",
    position: "relative",
    padding: "10px 14px",
    lineHeight: 1.35,
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    whiteSpace: "normal",
  };

  const plusBtn = {
    position: "absolute",
    right: -28,
    top: "50%",
    transform: "translateY(-50%)",
    width: 28,
    height: 28,
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.2)",
    background: "white",
    cursor: "pointer",
    fontSize: 18,
    lineHeight: "26px",
    padding: 0,
    zIndex: 5,
  };

  return (
    <div className="node-card" style={base}>
      {/* hover용 CSS: inline 스타일로 max-height/opacity 지정하지 않음 */}
      <style>{`
        .node-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.16); }
        .node-card .details-inline {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          padding-top: 0;
          transition: max-height 200ms ease, opacity 120ms ease, padding-top 120ms ease;
        }
        .node-card:hover .details-inline {
          max-height: 320px; /* 충분히 큰 값 */
          opacity: 1;
          padding-top: 6px;
        }
      `}</style>

      {/* 항상 보이는 타이틀 */}
      <div style={{ fontWeight: 700, fontSize: 14, marginRight: 12 }}>{name}</div>

      {/* 항상 보이는 + 버튼 (우측 고정) */}
      <button
        onClick={onAddChild}
        style={plusBtn}
        title={`Add child to "${name}"`}
        aria-label="Add child"
      >
        +
      </button>

      {/* 호버 시 내부에서 펼쳐지는 상세 */}
      <div className="details-inline">
        {date != null && (
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <b>Date:</b> {date}
          </div>
        )}
        {time != null && (
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <b>Time:</b> {time}
          </div>
        )}
        {value != null && (
          <div style={{ fontSize: 12, marginBottom: 4 }}>
            <b>Description:</b> {value}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#666" }}>
          <b>Children:</b> {childCount}
        </div>
      </div>
    </div>
  );
}