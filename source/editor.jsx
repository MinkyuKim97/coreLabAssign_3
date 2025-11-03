// import { useState, useEffect } from "react";
// import { createRoot } from "react-dom/client";

// import projectSchemes from "./projectData.json";

// window.addEventListener("load", async () => {
//   let root = createRoot(document.getElementById("root"));
//   root.render(<Editor />);
// });

// function Editor({}) {
//   let [projectName, setProjectName] = useState(projectSchemes.name);
//   let [children, setChildren] = useState(projectSchemes.children);
//   let projects = [];
//   let childProject_1 = [];

//   for (let i = 0; i < projectSchemes.children.length; ++i) {
//     let childrenProject = projectSchemes.children[i];
//     projects.push(
//       <Swatch
//         parentProject={projectSchemes.name}
//         childrenProject={childrenProject}
//         project={childrenProject.name}
//         color="#b8b8b8ff"
//         value={childrenProject.value}
//         key={childrenProject.value}
//       />
//     );
//   }

//   return (
//     <div id="editor">
//       <input
//         type="text"
//         value={projectName}
//         onChange={(event) => setTitle(event.target.value)}
//       ></input>
//       <div className="scheme">
//         {projects}
//         {projectName.length < 6 ? (
//           <button
//             className="new-swatch"
//             onClick={() =>
//               setProjectName([...projectName, { projectName: "New Project" }])
//             }
//           >
//             +
//           </button>
//         ) : null}
//       </div>
//     </div>
//   );
// }

// function Swatch({ parentProject, childrenProject, project, color, value }) {
//   if (childrenProject.children != null) {
//     for (let i = 0; i < childrenProject.children.length; ++i) {
//       let childrenProject_2 = childrenProject.children[i];
//       //--------- below Push is casuing the problem
//       // childProject_1.push(
//       //   <Swatch_2
//       //     parentProject={childrenProject}
//       //     childrenProject={childrenProject_2}
//       //     project={childrenProject_2.name}
//       //     value={childrenProject_2.value}
//       //     key={childrenProject_2.value}
//       //     color="#b8b8b8ff"
//       //   />
//       // );
//     }
//   }
//   return (
//     <div className="swatch" style={{ background: color }}>
//       <div>{parentProject}</div>
//       <div>{project}</div>
//       <div>{value}</div>
//       {/* {childProject_1} */}
//     </div>
//   );
// }

// function Swatch_2({ parentProject, childrenProject, project, color, value }) {
//   return (
//     <div className="swatch2" style={{ background: color }}>
//       <div>{parentProject}</div>
//       <div>{project}</div>
//       <div>{value}</div>
//     </div>
//   );
// }

// ---------------------------------------------------------

// import { useState, useEffect } from "react";
// import { createRoot } from "react-dom/client";
// import projectSchemes from "./projectData.json";

// window.addEventListener("load", async () => {
//   const root = createRoot(document.getElementById("root"));
//   root.render(<Editor />);
// });

// function Editor() {
//   const [projectName, setProjectName] = useState(projectSchemes.name);
//   const [children, setChildren] = useState(projectSchemes.children ?? []);

//   return (
//     <div id="editor">
//       <input
//         type="text"
//         value={projectName}
//         onChange={(e) => setProjectName(e.target.value)}
//       />
//       <div className="scheme">
//         {children.map((child) => (
//           <Swatch
//             key={child.value ?? child.name}
//             node={child}
//             parentName={projectSchemes.name}
//             level={0}
//           />
//         ))}

//         {children.length < 6 ? (
//           <button
//             className="new-swatch"
//             onClick={() =>
//               setChildren((prev) => [
//                 ...prev,
//                 { name: "New Project", value: Date.now(), children: [] },
//               ])
//             }
//           >
//             +
//           </button>
//         ) : null}
//       </div>
//     </div>
//   );
// }

// /** 재귀 컴포넌트 */
// function Swatch({ node, parentName, level = 0 }) {
//   const { name, date, time, value, children } = node ?? {};

//   return (
//     <div
//       className="swatch"
//       style={{
//         background: "#b8b8b8ff",
//         marginLeft: level * 16, // 들여쓰기로 계층감
//         marginTop: 8,
//         padding: 8,
//         borderRadius: 8,
//         border: "5px solid #999",
//       }}
//     >
//       {/* <div>parent: {parentName}</div> */}
//       <div>Project: {name}</div>
//       <div>Date: {date}</div>
//       <div>Time: {time}</div>
//       <div>Description: {value}</div>

//       {Array.isArray(children) && children.length > 0 && (
//         <div className="children">
//           {children.map((child) => (
//             <Swatch
//               key={(child.value ?? child.name) + ":" + value}
//               node={child}
//               parentName={name}
//               level={level + 1}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }
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
  const [projectName, setProjectName] = useState(
    projectSchemes?.name ?? "Root"
  );
  const [children, setChildren] = useState(projectSchemes?.children ?? []);

  // r.0.1 → [0,1]
  const parsePathToIndices = (id) =>
    (id ?? "")
      .split(".")
      .slice(1)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n));

  // 경로로 자식 추가 (불변 업데이트)
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

  const handleAddChildAt = (nodeId) => {
    const indices = parsePathToIndices(nodeId);
    const newChild = { name: "New Project", value: Date.now(), children: [] };
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

    // 간격 넓게 유지
    const tree = d3
      .tree()
      .nodeSize([50, 300]) // [세로 간격, 가로 간격]
      .separation((a, b) => (a.parent === b.parent ? 1.8 : 3.0));

    const laid = tree(root);
    const nodes = laid.descendants();
    const links = laid.links();

    // 스테이지 크기 계산
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
      <div
        className="viewport"
        style={{ position: "absolute", inset: 0, overflow: "auto", zIndex: 0 }}
      >
        <div
          className="stage"
          style={{
            position: "relative",
            width: layout.contentW,
            height: layout.contentH,
            margin: "0 auto",
          }}
        >
          {/* 링크 레이어 (클릭 방지) */}
          <svg
            width={layout.contentW}
            height={layout.contentH}
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
                .x((d) => layout.toStageX(d))
                .y((d) => layout.toStageY(d));
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

          {/* 노드 카드 */}
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
                childCount={
                  Array.isArray(n.data?.children) ? n.data.children.length : 0
                }
                onAddChild={() => handleAddChildAt(n.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 상단 좌측 컨트롤: 루트 이름만 */}
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
        <label
          style={{
            display: "block",
            fontSize: 12,
            color: "#555",
            marginBottom: 6,
          }}
        >
          Project Name
        </label>
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

// 노드 카드: 기본 name만, hover 시 상세 패널 / + 버튼은 항상 우측에 고정
function NodeCard({ id, name, date, time, value, childCount, onAddChild }) {
  const base = {
    background: "#fff",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.12)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    minWidth: 160,
    textAlign: "center",
    userSelect: "none",
    transition: "box-shadow 120ms ease", // ← transform 제거
    padding: "8px 16px",
    position: "relative",
    // transform 없음: 팝업이 다른 노드 위에 잘 뜨도록 스태킹 컨텍스트 방지
  };

  const detailsBox = {
    position: "absolute",
    left: "50%",
    top: "100%",
    transform: "translate(-50%, 10px)",
    background: "white",
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 8,
    boxShadow: "0 12px 32px rgba(0,0,0,0.16)",
    padding: 10,
    minWidth: 220,
    zIndex: 99999, // ← 항상 최상단
    pointerEvents: "auto",
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
    zIndex: 5000, // ← 팝업보다 낮게(원하면 더 낮춰도 됨)
  };

  return (
    <div className="node-card" style={base}>
      {/* 항상 보이는 이름 */}
      <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>

      {/* 항상 보이는 + 버튼(우측) */}
      <button
        onClick={onAddChild}
        style={plusBtn}
        title={`Add child to "${name}"`}
        aria-label="Add child"
      >
        +
      </button>

      {/* hover 시 상세 패널 */}
      <style>{`
        .node-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.16); }
        .node-card .details { display: none; }
        .node-card:hover .details { display: block; }
      `}</style>

      {date != null && time != null && value != null && (
        <div className="details" style={detailsBox}>
          {date != null && (
            <div style={{ fontSize: 12, marginBottom: 4, textAlign: "left" }}>
              <b>Date:</b> {date}
            </div>
          )}
          {time != null && (
            <div style={{ fontSize: 12, marginBottom: 4, textAlign: "left" }}>
              <b>Time:</b> {time}
            </div>
          )}

          {value != null && (
            <div style={{ fontSize: 12, marginBottom: 4, textAlign: "left" }}>
              <b>Description:</b> {value}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
