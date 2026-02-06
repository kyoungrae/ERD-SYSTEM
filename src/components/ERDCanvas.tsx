import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
    type Node,
    type Edge,
    type Connection,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    type NodeTypes,
    ConnectionMode,
    BackgroundVariant,
    ReactFlowProvider,
    PanOnScrollMode,
    useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import EntityNode from './EntityNode';
import ERDEdge from './ERDEdge';
import EdgeEditModal from './EdgeEditModal';
import ImportModal from './ImportModal';
import Sidebar from './Sidebar';
import { useERDStore } from '../store/erdStore';
import { type Relationship } from '../types/erd';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { Plus, Download, Upload, ChevronLeft, ChevronRight, LogOut, User as UserIcon, Home, Layout, ArrowDown, ArrowRight, ChevronDown, Frame } from 'lucide-react';
import { getLayoutedElements } from '../utils/layout';

const nodeTypes: NodeTypes = {
    entity: EntityNode,
};

const edgeTypes = {
    erd: ERDEdge,
};

const ERDCanvasContent: React.FC = () => {
    const {
        entities,
        relationships,
        addEntity,
        updateEntity,
        addRelationship,
        updateRelationship,
        deleteRelationship,
        exportData,
        importData
    } = useERDStore();

    const { user, logout } = useAuthStore();
    const { projects, currentProjectId, setCurrentProject, updateProjectData } = useProjectStore();

    const currentProject = projects.find(p => p.id === currentProjectId);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);
    const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);
    const flowWrapper = React.useRef<HTMLDivElement>(null);
    const { getViewport } = useReactFlow();

    // Initial load of project data into ERDStore
    useEffect(() => {
        if (currentProject) {
            importData(currentProject.data);
        }
    }, [currentProjectId]); // Run when project changes

    // Auto-save ERDStore changes to ProjectStore
    useEffect(() => {
        if (currentProjectId) {
            const timer = setTimeout(() => {
                updateProjectData(currentProjectId, {
                    entities,
                    relationships,
                });
            }, 1000); // Debounce saves
            return () => clearTimeout(timer);
        }
    }, [entities, relationships, currentProjectId, updateProjectData]);

    // Convert entities to ReactFlow nodes
    useEffect(() => {
        const flowNodes: Node[] = entities.map((entity) => ({
            id: entity.id,
            type: 'entity',
            position: entity.position,
            data: { entity },
        }));
        setNodes(flowNodes);
    }, [entities, setNodes]);

    // Convert relationships to ReactFlow edges
    useEffect(() => {
        const getRelColor = (type: string) => {
            switch (type) {
                case '1:1': return '#10b981'; // Green
                case '1:N': return '#3b82f6'; // Blue
                case 'N:M': return '#8b5cf6'; // Purple
                default: return '#3b82f6';
            }
        };

        const flowEdges: Edge[] = relationships.map((rel) => ({
            id: rel.id,
            source: rel.source,
            target: rel.target,
            sourceHandle: rel.sourceHandle,
            targetHandle: rel.targetHandle,
            type: 'erd',
            label: rel.type,
            animated: true,
            reconnectable: true,
            hidden: rel.id === reconnectingEdgeId, // Hide while being "moved"
            interactionWidth: 40,
            style: { stroke: getRelColor(rel.type), strokeWidth: 2 },
            data: { color: getRelColor(rel.type) }
        }));
        setEdges(flowEdges);
    }, [relationships, setEdges, reconnectingEdgeId]);

    const isValidConnection = useCallback((connection: Connection) => {
        if (connection.source === connection.target) return false;
        return true;
    }, []);

    const onConnectStart = useCallback((_event: any, params: any) => {
        // Find if any relationship is already using this handle
        const existingRel = relationships.find(rel =>
            (rel.source === params.nodeId && rel.sourceHandle === params.handleId) ||
            (rel.target === params.nodeId && rel.targetHandle === params.handleId)
        );
        if (existingRel) {
            setReconnectingEdgeId(existingRel.id);
        }
    }, [relationships]);

    const onConnect = useCallback(
        (params: Connection) => {
            if (params.source && params.target && params.source !== params.target) {
                // Use the ID we started dragging, or find by endpoints
                const targetId = reconnectingEdgeId || relationships.find(rel =>
                    (rel.source === params.source && rel.target === params.target) ||
                    (rel.source === params.target && rel.target === params.source)
                )?.id;

                if (targetId) {
                    updateRelationship(targetId, {
                        source: params.source,
                        target: params.target,
                        sourceHandle: params.sourceHandle || undefined,
                        targetHandle: params.targetHandle || undefined,
                    });
                } else {
                    const newRelationship = {
                        id: `rel_${Date.now()}`,
                        source: params.source,
                        target: params.target,
                        sourceHandle: params.sourceHandle || undefined,
                        targetHandle: params.targetHandle || undefined,
                        type: '1:N' as const,
                    };
                    addRelationship(newRelationship);
                }
            }
            setReconnectingEdgeId(null);
        },
        [relationships, reconnectingEdgeId, addRelationship, updateRelationship]
    );

    const onConnectEnd = useCallback(() => {
        // Delay clearing to allow onConnect to catch it
        setTimeout(() => setReconnectingEdgeId(null), 100);
    }, []);

    const onReconnectStart = useCallback((_: any, edge: Edge) => {
        setReconnectingEdgeId(edge.id);
    }, []);

    const onReconnect = useCallback(
        (oldEdge: Edge, newConnection: Connection) => {
            updateRelationship(oldEdge.id, {
                source: newConnection.source || oldEdge.source,
                target: newConnection.target || oldEdge.target,
                sourceHandle: newConnection.sourceHandle || undefined,
                targetHandle: newConnection.targetHandle || undefined,
            });
            setReconnectingEdgeId(null);
        },
        [updateRelationship]
    );

    const onReconnectEnd = useCallback(() => {
        setReconnectingEdgeId(null);
    }, []);

    const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
        const rel = relationships.find(r => r.id === edge.id);
        if (rel) {
            setEditingRelationship(rel);
        }
    }, [relationships]);

    const handleAddEntity = () => {
        const newEntity = {
            id: `entity_${Date.now()}`,
            name: 'New Entity',
            position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
            attributes: [
                {
                    id: `attr_${Date.now()}`,
                    name: 'id',
                    type: 'INT',
                    isPK: true,
                    isFK: false,
                },
            ],
            isLocked: false,
        };
        addEntity(newEntity);
    };

    const handleExport = () => {
        const data = exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `erd-diagram-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };



    const onLayout = useCallback((direction: 'TB' | 'LR' = 'TB', scope: 'ALL' | 'VISIBLE' = 'ALL') => {
        let nodesToLayout = nodes;
        let edgesToLayout = edges;

        // If filtering by visibility
        if (scope === 'VISIBLE' && flowWrapper.current) {
            const { x, y, zoom } = getViewport();
            const { width, height } = flowWrapper.current.getBoundingClientRect();

            // Calculate visible bounds (world coordinates)
            const minX = -x / zoom;
            const minY = -y / zoom;
            const maxX = minX + width / zoom;
            const maxY = minY + height / zoom;

            nodesToLayout = nodes.filter(node => {
                const nodeX = node.position.x;
                const nodeY = node.position.y;
                const nodeW = (node.width || 200);
                const nodeH = (node.height || 100);

                // Simple intersection check
                return (
                    nodeX < maxX &&
                    nodeX + nodeW > minX &&
                    nodeY < maxY &&
                    nodeY + nodeH > minY
                );
            });

            const nodeIds = new Set(nodesToLayout.map(n => n.id));
            edgesToLayout = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
        }

        if (nodesToLayout.length === 0) {
            alert("화면에 정렬할 테이블이 없습니다.");
            setIsLayoutMenuOpen(false);
            return;
        }

        const { nodes: layoutedNodes } = getLayoutedElements(
            nodesToLayout,
            edgesToLayout,
            direction
        );

        let finalNodes = layoutedNodes;

        // If we only laid out a subset, we need to position them relative to where they were, 
        // essentially centering the new group in the bounding box of the old group.
        if (scope === 'VISIBLE') {
            const getBounds = (nodeList: Node[]) => {
                if (nodeList.length === 0) return { x: 0, y: 0, w: 0, h: 0, cx: 0, cy: 0 };
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                nodeList.forEach(n => {
                    minX = Math.min(minX, n.position.x);
                    minY = Math.min(minY, n.position.y);
                    maxX = Math.max(maxX, n.position.x + (n.width || 0));
                    maxY = Math.max(maxY, n.position.y + (n.height || 0));
                });
                return { x: minX, y: minY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
            };

            const oldBounds = getBounds(nodesToLayout);
            const newBounds = getBounds(layoutedNodes);

            const dx = oldBounds.cx - newBounds.cx;
            const dy = oldBounds.cy - newBounds.cy;

            finalNodes = layoutedNodes.map(n => ({
                ...n,
                position: {
                    x: n.position.x + dx,
                    y: n.position.y + dy
                }
            }));
        }

        // Merge updated nodes back into the main list
        const newAllNodes = nodes.map(node => {
            const updated = finalNodes.find(n => n.id === node.id);
            return updated ? updated : node;
        });

        const newAllEdges = edges.map(edge => {
            const updated = (edgesToLayout as Edge[]).find(e => e.id === edge.id);
            // Note: getLayoutedElements returns edges, but typically dagre doesn't change edges unless purely routing points (which dagre doesn't do for reactflow simple edges usually).
            // But we should use the returned edges just in case.
            return updated ? updated : edge;
        });

        setNodes(newAllNodes);
        setEdges(newAllEdges);

        // Sync with store
        const updatedEntities = entities.map(entity => {
            const layoutNode = finalNodes.find(n => n.id === entity.id);
            if (layoutNode) {
                return { ...entity, position: layoutNode.position };
            }
            return entity;
        });

        importData({
            entities: updatedEntities,
            relationships: relationships
        });
        setIsLayoutMenuOpen(false);
    }, [nodes, edges, entities, relationships, setNodes, setEdges, importData, getViewport]);

    const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
        updateEntity(node.id, { position: node.position });
    }, [updateEntity]);

    return (
        <div className="flex w-full h-screen overflow-hidden bg-gray-50">
            {/* Left Sidebar wrapper with transition */}
            <div className="relative flex h-full">
                <div
                    className={`h-full transition-all duration-300 ease-in-out border-r border-gray-200 overflow-hidden bg-white shadow-xl ${isSidebarOpen ? 'w-72 flex-shrink-0' : 'w-0 border-none'
                        }`}
                >
                    <div className="w-72 h-full">
                        <Sidebar />
                    </div>
                </div>

                {/* Attached Toggle Button */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`absolute top-1/2 -translate-y-1/2 z-30 w-5 h-12 bg-white rounded-r-lg shadow-md border border-l-0 border-gray-200 text-gray-400 hover:text-blue-500 hover:w-6 transition-all active:scale-95 flex items-center justify-center ${isSidebarOpen ? '-right-5' : 'left-0'
                        }`}
                    title={isSidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
                >
                    {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 h-full relative" ref={flowWrapper}>
                {/* Toolbar */}
                <div className={`absolute top-4 ${isSidebarOpen ? 'left-6' : 'left-8'} z-10 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 p-1.5 flex gap-1.5 transition-all duration-300`}>
                    <button
                        onClick={() => setCurrentProject(null)}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm font-bold shadow-sm active:scale-95"
                        title="프로젝트 목록으로 돌아가기"
                    >
                        <Home size={16} className="text-blue-500" />
                    </button>

                    <div className="w-[1px] h-8 bg-gray-200 mx-1 self-center" />

                    <button
                        onClick={handleAddEntity}
                        className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-md hover:shadow-lg active:scale-95"
                    >
                        <Plus size={16} />
                        테이블 추가
                    </button>

                    <div className="w-[1px] h-8 bg-gray-200 mx-1 self-center" />

                    <div className="relative">
                        <button
                            onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                            className="flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm font-bold shadow-sm active:scale-95"
                        >
                            <Layout size={16} className="text-orange-500" />
                            <span>정렬</span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isLayoutMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isLayoutMenuOpen && (
                            <div className="absolute top-full lg:left-0 right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => onLayout('TB')}
                                    className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors text-left"
                                >
                                    <ArrowRight size={16} className="text-green-500" />
                                    <span>가로 정렬 (기본)</span>
                                </button>
                                <button
                                    onClick={() => onLayout('LR')}
                                    className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors text-left"
                                >
                                    <ArrowDown size={16} className="text-blue-500" />
                                    <span>세로 정렬</span>
                                </button>
                                <div className="h-[1px] bg-gray-100 my-1" />
                                <button
                                    onClick={() => onLayout('TB', 'VISIBLE')}
                                    className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors text-left"
                                >
                                    <Frame size={16} className="text-purple-500" />
                                    <span>화면 내 가로 정렬</span>
                                </button>
                                <button
                                    onClick={() => onLayout('LR', 'VISIBLE')}
                                    className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors text-left"
                                >
                                    <Frame size={16} className="text-orange-500" />
                                    <span>화면 내 세로 정렬</span>
                                </button>
                            </div>
                        )}
                    </div>


                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm font-bold shadow-sm active:scale-95"
                    >
                        <Upload size={16} className="text-green-500" />
                        내보내기
                    </button>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-sm font-bold shadow-sm active:scale-95"
                    >
                        <Download size={16} className="text-purple-500" />
                        가져오기
                    </button>

                    <div className="w-[1px] h-8 bg-gray-200 mx-1 self-center" />

                    {/* User Profile & Logout */}
                    <div className="flex items-center gap-2 px-1">
                        <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                            {user?.picture ? (
                                <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full border border-white shadow-sm" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <UserIcon size={14} />
                                </div>
                            )}
                            <span className="text-sm font-bold text-gray-700">{user?.name}</span>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm('로그아웃 하시겠습니까?')) {
                                    setCurrentProject(null);
                                    logout();
                                }
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-95"
                            title="로그아웃"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* React Flow Canvas */}
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd}
                    onReconnect={onReconnect}
                    onReconnectStart={onReconnectStart}
                    onReconnectEnd={onReconnectEnd}
                    isValidConnection={isValidConnection}
                    onEdgeDoubleClick={onEdgeDoubleClick}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    connectionMode={ConnectionMode.Loose}
                    panOnScroll={true}
                    panOnScrollMode={PanOnScrollMode.Free}
                    zoomOnScroll={false}
                    zoomOnDoubleClick={false}
                    zoomActivationKeyCode="Control"
                    minZoom={0.05}
                    maxZoom={4}
                    fitView
                >
                    <Controls />
                    <MiniMap
                        nodeColor={() => '#3b82f6'}
                        className="!bg-white !border-2 !border-gray-100 !rounded-xl !shadow-lg"
                    />
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1.5}
                        color="#84878bff"
                    />
                </ReactFlow>

                {/* Modals */}
                {isImportModalOpen && (
                    <ImportModal onClose={() => setIsImportModalOpen(false)} />
                )}

                {editingRelationship && (
                    <EdgeEditModal
                        relationship={editingRelationship}
                        sourceEntityName={entities.find(e => e.id === editingRelationship.source)?.name || 'Unknown'}
                        targetEntityName={entities.find(e => e.id === editingRelationship.target)?.name || 'Unknown'}
                        onSave={(updated) => updateRelationship(updated.id, updated)}
                        onDelete={() => {
                            deleteRelationship(editingRelationship.id);
                            setEditingRelationship(null);
                        }}
                        onClose={() => setEditingRelationship(null)}
                    />
                )}
            </div>
        </div>
    );
};

const ERDCanvas: React.FC = () => {
    return (
        <ReactFlowProvider>
            <ERDCanvasContent />
        </ReactFlowProvider>
    );
};

export default ERDCanvas;
