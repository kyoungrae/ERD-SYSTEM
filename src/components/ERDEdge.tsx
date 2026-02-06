import {
    type EdgeProps,
    getSmoothStepPath,
    EdgeLabelRenderer,
    BaseEdge,
} from 'reactflow';

const ERDEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    style = {},
    markerEnd,
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    <div
                        title="관계 설정 수정 *Double Click"
                        className="px-2 py-0.5 bg-white/95 backdrop-blur-sm border border-blue-200 rounded shadow-sm text-[10px] font-bold text-blue-600 cursor-pointer hover:scale-110 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200"
                    >
                        {label}
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default ERDEdge;
