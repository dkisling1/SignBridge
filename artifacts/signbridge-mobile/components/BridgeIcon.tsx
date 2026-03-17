import React from "react";
import Svg, { Line } from "react-native-svg";

interface BridgeIconProps {
  size: number;
  color: string;
}

export function BridgeIcon({ size, color }: BridgeIconProps) {
  const sw = "2";
  const lc = "round";
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="2" y1="15" x2="22" y2="15" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
      <Line x1="7" y1="7" x2="7" y2="19" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
      <Line x1="17" y1="7" x2="17" y2="19" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
      <Line x1="7" y1="7" x2="2" y2="15" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
      <Line x1="7" y1="7" x2="12" y2="15" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
      <Line x1="17" y1="7" x2="12" y2="15" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
      <Line x1="17" y1="7" x2="22" y2="15" stroke={color} strokeWidth={sw} strokeLinecap={lc} />
    </Svg>
  );
}
