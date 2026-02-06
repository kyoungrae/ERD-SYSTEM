import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  ConnectionMode,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import EntityNode from './EntityNode';
import { useERDStore } from '../store/erdStore';
import { Entity } from '../types/erd';
import { Plus, Download, Upload } from 'lucide-react';

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

const ERDCanvas: React.FC = () => {
  const { entities, relationships, addEntity, addRelationship, exportData, importData } = useERDStore();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert entities to ReactFlow nodes
  React.useEffect(() => {
    const flowNodes = entities.map((entity): Node => ({
      id: entity.id,
      type: 'entity',
      position: entity.position,
      data: {
        entity,
        onUpdate: (updatedEntity: Entity) => {
          // Update entity in store
          const index = entities.findIndex(e => e.id === updatedEntity.id);
          if (index !== -1) {
            const newEntities = [...entities];
            newEntities[index] = updatedEntity;
            // This would need to be handled in the store
          }
        }
      }
    }));
    setNodes(flowNodes);
  }, [entities, setNodes]);

  // Convert relationships to ReactFlow edges
  React.useEffect(() => {
    const flowEdges = relationships.map((rel): Edge => ({
      id: rel.id,
      source: rel.source,
      target: rel.target,
      type: 'smoothstep',
      label: rel.type,
      style: { stroke: '#374151' },
      labelStyle: { fill: '#374151', fontSize: 12 }
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
          type: '1:N' as const
        };
        addRelationship(newRelationship);
      }
    },
    [addRelationship]
  );

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
          isFK: false
        }
      ]
    };
    addEntity(newEntity);
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'erd-diagram.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          importData(data);
        } catch (error) {
          console.error('Failed to import file:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="w-full h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-2 flex gap-2">
        <button
          onClick={handleAddEntity}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          <Plus size={16} />
          Add Entity
        </button>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          <Download size={16} />
          Export
        </button>
        
        <label className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors cursor-pointer">
          <Upload size={16} />
          Import
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default ERDCanvas;
