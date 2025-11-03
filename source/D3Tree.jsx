// src/D3Tree.jsx
import React, { useMemo, useState } from "react";
import * as d3 from "d3";

const getId = (n) => n.data?.value ?? n.data?.name ?? `${n.depth}-${n.index}`;

export default function D3Tree({
  data,
  width = 960,
  height = 600,
  nodeSize = [56, 160], // [vertical gap, horizontal gap]
  margin = { top: 40, right: 40, bottom: 40, left: 40 },
}) {
  const [collapsed, setCollapsed] = useState(new Set());

  const root = useMemo(() => {
    // 1) 계층화
    const h = d3.hierarchy(data);

    // 2) 접기 상태 반영(접힌 노드는 children 제거)
    h.eachBefore((n) => {
      n._hasChildren = Array.isArray(n.children) && n.children.length > 0;
      if (collapsed.has(getId(n))) n.children = null;
    });

    // 3) 트리 좌표 계산
    return d3.tree().nodeSize(nodeSize)(h);
  }, [data, nodeSize, collapsed]);

  const nodes = root.descendants();
  const links = root.links();

  return (
    <svg width={width} height={height} style={{ border: "1px solid #eee" }}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        {/* 간선 */}
        {links.map((link, i) => (
          <path
            key={i}
            d={d3
              .linkHorizontal()
              .x((d) => d.y)
              .y((d) => d.x)({
                source: link.source,
                target: link.target,
              })}
            fill="none"
            stroke="#c0c0c0"
            strokeWidth={1.5}
          />
        ))}

        {/* 노드 */}
        {nodes.map((n) => {
          const id = getId(n);
          const isCollapsed = collapsed.has(id);
          return (
            <g
              key={id}
              transform={`translate(${n.y},${n.x})`}
              style={{ cursor: n._hasChildren ? "pointer" : "default" }}
              onClick={() => {
                if (!n._hasChildren) return;
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  next.has(id) ? next.delete(id) : next.add(id);
                  return next;
                });
              }}
            >
              {/* Swatch 느낌의 박스 */}
              <rect x={-70} y={-18} width={140} height={36} rx={8} fill="#b8b8b8" />
              <text textAnchor="middle" dy="0.35em" fontSize={12}>
                {n.data?.name}
              </text>

              {/* 접기/펼치기 표시(자식이 있을 때만) */}
              {n._hasChildren && (
                <text x={-78} y={4} fontSize={14} textAnchor="end" pointerEvents="none">
                  {isCollapsed ? "▶" : "▼"}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}