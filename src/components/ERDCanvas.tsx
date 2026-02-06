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
} from 'reactflow';
import 'reactflow/dist/style.css';

import EntityNode from './EntityNode';
import ERDEdge from './ERDEdge';
import EdgeEditModal from './EdgeEditModal';
import ImportModal from './ImportModal';
import Sidebar from './Sidebar';
import { useERDStore } from '../store/erdStore';
import { type Relationship } from '../types/erd';
import { Plus, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

const nodeTypes: NodeTypes = {
    entity: EntityNode,
};

const edgeTypes = {
    erd: ERDEdge,
};

const ERDCanvas: React.FC = () => {
    const {
        entities,
        relationships,
        addEntity,
        updateEntity,
        addRelationship,
        updateRelationship,
        deleteRelationship,
        exportData
    } = useERDStore();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);

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
            style: { stroke: '#3b82f6', strokeWidth: 2 },
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
            <div className="flex-1 h-full relative">
                {/* Toolbar */}
                <div className={`absolute top-4 ${isSidebarOpen ? 'left-6' : 'left-8'} z-10 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 p-1.5 flex gap-1.5 transition-all duration-300`}>
                    <button
                        onClick={handleAddEntity}
                        className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-md hover:shadow-lg active:scale-95"
                    >
                        <Plus size={16} />
                        테이블 추가
                    </button>

                    <div className="w-[1px] h-8 bg-gray-200 mx-1 self-center" />

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
                        size={1}
                        color="#e5e7eb"
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

export default ERDCanvas;
