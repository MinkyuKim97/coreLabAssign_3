// import { useState } from "react";
// import { createRoot } from "react-dom/client";

// import projectScehmes from "./projectData.json"

// window.addEventListener("load", async () => {
//   let root = createRoot(document.getElementById("root"));
//   root.render(<App schemes={projectScehmes}/>);
// });

// function App({ schemes }) {
//   let [sort, updateSort] = useState("id");

//   let schemeComponents = [];

//   schemes = schemes.toSorted((a, b) => a[sort] - b[sort]);

//   for (let scheme of schemes) {
//     schemeComponents.push(
//       <SchemeUI key={scheme.id} title={scheme.title} colors={scheme.colors}></SchemeUI>
//     );
//   }

//   return <div>
//     <label>Sort by:</label>
//     <select value={sort} onChange={(event) => updateSort(event.target.value)}>
//       <option value="id">ID</option>
//       <option value="title">Title</option>
//     </select>
//     <ul>
//       {schemeComponents}
//     </ul>
//   </div>;
// }

// function SchemeUI({title, colors}) {
//   return <li>{title}
//     <ul>{colors.map(color => <li style={{ background: "#" + color, color: "white"}}>{color}</li>)}</ul>
//     <input type="color"></input>
//   </li>
// }