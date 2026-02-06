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
    interactionWidth,
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
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={style}
                interactionWidth={interactionWidth}
            />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan group"
                >
                    {/* 관계 타입 라벨 */}
                    <div className="px-2 py-0.5 bg-white/95 backdrop-blur-sm border border-blue-200 rounded shadow-sm text-[10px] font-bold text-blue-600 cursor-pointer hover:scale-110 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200">
                        {label}
                    </div>

                    {/* 즉시 나타나는 커스텀 툴팁 */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 translate-y-1 group-hover:translate-y-0 z-50">
                        <div className="bg-gray-800/90 backdrop-blur-sm text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-white/10">
                            <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" />
                            관계 설정 수정 (더블 클릭)
                            {/* 툴팁 화살표 */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-800/90" />
                        </div>
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default ERDEdge;
