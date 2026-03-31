import React from "react";
import { FONTS } from "../constants";

export type TabDef = { label: string; active?: boolean };

/** Realistic iTerm2-style terminal tab bar */
export const TerminalTabBar: React.FC<{
  tabs: TabDef[];
  height?: number;
}> = ({ tabs, height = 34 }) => {
  return (
    <div
      style={{
        height,
        flexShrink: 0,
        background: "#1c1c1c",
        display: "flex",
        alignItems: "stretch",
        borderBottom: "1px solid #2a2a2a",
      }}
    >
      {tabs.map((tab, i) => (
        <div
          key={i}
          style={{
            padding: "0 18px",
            display: "flex",
            alignItems: "center",
            fontFamily: FONTS.mono,
            fontSize: 13,
            color: tab.active ? "#d8d8d8" : "#555",
            background: tab.active ? "#0d0d0d" : "transparent",
            borderRight: "1px solid #2a2a2a",
            whiteSpace: "nowrap",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            flexShrink: 0,
          }}
        >
          {tab.label}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div
        style={{
          width: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          color: "#444",
          borderLeft: "1px solid #2a2a2a",
          fontFamily: FONTS.mono,
        }}
      >
        +
      </div>
    </div>
  );
};
