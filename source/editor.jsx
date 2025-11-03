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

  import { useState, useEffect } from "react";
  import { createRoot } from "react-dom/client";
  import projectSchemes from "./projectData.json";

  window.addEventListener("load", async () => {
    const root = createRoot(document.getElementById("root"));
    root.render(<Editor />);
  });

  function Editor() {
    const [projectName, setProjectName] = useState(projectSchemes.name);
    const [children, setChildren] = useState(projectSchemes.children ?? []);

    return (
      <div id="editor">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <div className="scheme">
          {children.map((child) => (
            <Swatch
              key={child.value ?? child.name}
              node={child}
              parentName={projectSchemes.name}
              level={0}
            />
          ))}

          {children.length < 6 ? (
            <button
              className="new-swatch"
              onClick={() =>
                setChildren((prev) => [
                  ...prev,
                  { name: "New Project", value: Date.now(), children: [] },
                ])
              }
            >
              +
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  /** 재귀 컴포넌트 */
  function Swatch({ node, parentName, level = 0 }) {
    const { name, date, time, value, children } = node ?? {};

    return (
      <div
        className="swatch"
        style={{
          background: "#b8b8b8ff",
          marginLeft: level * 16, // 들여쓰기로 계층감
          padding: 8,
          borderRadius: 8,
        }}
      >
        {/* <div>parent: {parentName}</div> */}
        <div>Project: {name}</div>
        <div>Date: {date}</div>
        <div>Time: {time}</div>
        <div>Description: {value}</div>

        {Array.isArray(children) && children.length > 0 && (
          <div className="children">
            {children.map((child) => (
              <Swatch
                key={(child.value ?? child.name) + ":" + value}
                node={child}
                parentName={name}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }



// -------------------------------------------------
// src/Editor.jsx
// import React, { useState } from "react";
// import { createRoot } from "react-dom/client";
// import D3Tree from "./D3Tree";
// import projectSchemes from "./projectData.json";  


// // 재귀 Swatch (기존 구조 유지)
// function Swatch({ node, parentName, level = 0 }) {
//   const { name, value, children } = node ?? {};
//   return (
//     <div
//       className="swatch"
//       style={{
//         background: "#b8b8b8ff",
//         marginLeft: level * 16,
//         padding: 8,
//         borderRadius: 8,
//         marginBottom: 6,
//       }}
//     >
//       <div>parent: {parentName}</div>
//       <div>project: {name}</div>
//       <div>value: {value}</div>

//       {Array.isArray(children) && children.length > 0 && (
//         <div className="children">
//           {children.map((child) => (
//             <Swatch
//               key={(child.value ?? child.name) + ":" + (value ?? name)}
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

// export default function Editor() {
//   // 최상위 상태: 이름 + 1차 children
//   const [projectName, setProjectName] = useState(projectSchemes.name);
//   const [children, setChildren] = useState(projectSchemes.children ?? []);

//   // D3 트리에 넘길 루트 데이터 (구조 유지)
//   const data = { name: projectName, value: "root", children };

//   // 샘플: 상단 버튼으로 1차 child 추가
//   const addChild = () => {
//     setChildren((prev) => [
//       ...prev,
//       { name: "New Project", value: Date.now(), children: [] },
//     ]);
//   };

//   if (typeof window !== "undefined") {
//   window.addEventListener("DOMContentLoaded", () => {
//     const el = document.getElementById("root");
//     if (el && !el.__mounted) {
//       el.__mounted = true;
//       createRoot(el).render(<Editor />);
//     }
//   });
// }

//   return (
//     <div id="editor" style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 16 }}>
//       {/* 좌측: 입력 + 재귀 Swatch 리스트(기존 UI) */}
//       <div>
//         <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>
//           Project Name
//         </label>
//         <input
//           type="text"
//           value={projectName}
//           onChange={(e) => setProjectName(e.target.value)}
//           style={{ width: "100%", padding: 8, marginBottom: 12 }}
//         />

//         <button onClick={addChild} className="new-swatch" style={{ marginBottom: 12 }}>
//           + Add 1st-level child
//         </button>

//         <div className="scheme">
//           {children.map((child) => (
//             <Swatch
//               key={child.value ?? child.name}
//               node={child}
//               parentName={projectName}
//               level={0}
//             />
//           ))}
//         </div>
//       </div>

//       {/* 우측: D3 트리 시각화 */}
//       <div>
//         <D3Tree data={data} width={1000} height={600} />
//       </div>
//     </div>
//   );
// }