import React from 'react';
import { BaseEdge, getSmoothStepPath, type EdgeProps } from 'reactflow';

export type EdgeType = 'dataflow' | 'control' | 'api' | 'event' | 'dependency' | 'monitoring' | 'security';

interface AnimatedEdgeData {
  edgeType?: EdgeType;
  label?: string;
  animated?: boolean;
  [key: string]: unknown;
}

const edgeTypeConfig: Record<EdgeType, { stroke: string; strokeWidth: number; dashArray?: string }> = {
  dataflow:   { stroke: '#06b6d4', strokeWidth: 2 },
  control:    { stroke: '#a78bfa', strokeWidth: 1.5, dashArray: '6 4' },
  api:        { stroke: '#34d399', strokeWidth: 1.5 },
  event:      { stroke: '#fbbf24', strokeWidth: 1.5, dashArray: '4 4' },
  dependency: { stroke: '#6b7280', strokeWidth: 1, dashArray: '2 4' },
  monitoring: { stroke: '#818cf8', strokeWidth: 1, dashArray: '8 4' },
  security:   { stroke: '#f87171', strokeWidth: 1, dashArray: '4 2' },
};

const AnimatedEdge: React.FC<EdgeProps<AnimatedEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const edgeType = data?.edgeType || 'dataflow';
  const config = edgeTypeConfig[edgeType] || edgeTypeConfig.dataflow;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  const isAnimated = data?.animated !== false;

  return (
    <>
      {/* Glow effect for selected */}
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke={config.stroke}
          strokeWidth={config.strokeWidth + 4}
          strokeOpacity={0.15}
          className="blur-sm"
        />
      )}

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: config.stroke,
          strokeWidth: config.strokeWidth,
          strokeDasharray: config.dashArray,
          filter: selected ? `drop-shadow(0 0 4px ${config.stroke})` : undefined,
        }}
      />

      {/* Animated particles along the edge */}
      {isAnimated && (
        <g>
          {[0, 0.25, 0.5, 0.75].map((offset) => (
            <circle key={offset} r="2" fill={config.stroke} opacity="0.6">
              <animateMotion
                dur="3s"
                repeatCount="indefinite"
                begin={`${offset * 3}s`}
                path={edgePath}
              />
              <animate
                attributeName="opacity"
                values="0;0.8;0.8;0"
                dur="3s"
                repeatCount="indefinite"
                begin={`${offset * 3}s`}
              />
            </circle>
          ))}
        </g>
      )}

      {/* Edge label */}
      {data?.label && (
        <g transform={`translate(${labelX}, ${labelY})`}>
          <rect
            x={-30}
            y={-10}
            width={60}
            height={20}
            rx={6}
            fill="#111827"
            stroke={config.stroke}
            strokeWidth={0.5}
            strokeOpacity={0.5}
          />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fill={config.stroke}
            fontSize={9}
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight={500}
          >
            {data.label}
          </text>
        </g>
      )}
    </>
  );
};

export default AnimatedEdge;
export { edgeTypeConfig };
