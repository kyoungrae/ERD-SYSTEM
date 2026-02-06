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
import { useERDStore } from '../store/erdStore';
import { type Relationship } from '../types/erd';
import { Plus, Download, Upload } from 'lucide-react';

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
        <div className="w-full h-screen bg-gray-50">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2 flex gap-2">
                <button
                    onClick={handleAddEntity}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                    <Plus size={18} />
                    Add Table
                </button>

                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                    <Download size={18} />
                    Export
                </button>

                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium shadow-md hover:shadow-lg"
                >
                    <Upload size={18} />
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
                    className="!bg-white !border-2 !border-gray-200"
                />
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={16}
                    size={1}
                    color="#d1d5db"
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
    );
};

export default ERDCanvas;
