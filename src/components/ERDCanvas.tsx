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
import EdgeEditModal from './EdgeEditModal';
import ImportModal from './ImportModal';
import Sidebar from './Sidebar';
import { useERDStore } from '../store/erdStore';
import { type Relationship } from '../types/erd';
import { Plus, Download, Upload, ChevronLeft, ChevronRight } from 'lucide-react';

const nodeTypes: NodeTypes = {
    entity: EntityNode,
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
    const [editingRelationship, setEditingRelationship] = useState<Relationship | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
            type: 'smoothstep',
            label: rel.type,
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            labelStyle: { fill: '#1f2937', fontWeight: 600 },
            labelBgStyle: { fill: '#ffffff', fillOpacity: 0.8 },
        }));
        setEdges(flowEdges);
    }, [relationships, setEdges]);

    const onConnect = useCallback(
        (params: Connection) => {
            if (params.source && params.target) {
                const newRelationship = {
                    id: `rel_${Date.now()}`,
                    source: params.source,
                    target: params.target,
                    type: '1:N' as const,
                };
                addRelationship(newRelationship);
            }
        },
        [addRelationship]
    );

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
                    title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
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
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-md hover:shadow-lg active:scale-95"
                    >
                        <Plus size={18} />
                        Add Table
                    </button>

                    <div className="w-[1px] h-8 bg-gray-200 mx-1 self-center" />

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-semibold shadow-sm active:scale-95"
                    >
                        <Upload size={18} className="text-green-500" />
                        Export
                    </button>

                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-semibold shadow-sm active:scale-95"
                    >
                        <Download size={18} className="text-purple-500" />
                        Import
                    </button>
                </div>

                {/* React Flow Canvas */}
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onEdgeDoubleClick={onEdgeDoubleClick}
                    onNodeDragStop={onNodeDragStop}
                    nodeTypes={nodeTypes}
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
