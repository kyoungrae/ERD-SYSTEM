import React, { useState, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Entity, Attribute } from '../types/erd';
import { useERDStore } from '../store/erdStore';
import { Key, Plus, Trash2 } from 'lucide-react';

interface EntityNodeProps {
  data: {
    entity: Entity;
    onUpdate: (entity: Entity) => void;
  };
  selected: boolean;
}

const EntityNode: React.FC<EntityNodeProps> = ({ data, selected }) => {
  const { entity, onUpdate } = data;
  const { updateAttribute, deleteAttribute, addAttribute } = useERDStore();
  const [newAttributeName, setNewAttributeName] = useState('');
  const lastAttributeRef = useRef<HTMLInputElement>(null);

  const handleAttributeChange = (attributeId: string, field: keyof Attribute, value: any) => {
    updateAttribute(entity.id, attributeId, { [field]: value });
  };

  const handleAddAttribute = () => {
    if (newAttributeName.trim()) {
      const newAttribute: Attribute = {
        id: `${entity.id}_attr_${Date.now()}`,
        name: newAttributeName,
        type: 'VARCHAR',
        isPK: false,
        isFK: false
      };
      addAttribute(entity.id, newAttribute);
      setNewAttributeName('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, attributeId?: string) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (attributeId) {
        const currentIndex = entity.attributes.findIndex(attr => attr.id === attributeId);
        if (currentIndex === entity.attributes.length - 1) {
          setNewAttributeName('');
          setTimeout(() => lastAttributeRef.current?.focus(), 0);
        }
      } else if (!newAttributeName.trim()) {
        handleAddAttribute();
      }
    }
  };

  const handleDeleteAttribute = (attributeId: string) => {
    deleteAttribute(entity.id, attributeId);
  };

  return (
    <div className={`bg-white border-2 rounded-lg shadow-lg min-w-64 ${selected ? 'border-blue-500' : 'border-gray-300'}`}>
      <Handle type="target" position={Position.Top} />
      
      {/* Entity Header */}
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 rounded-t-lg">
        <input
          type="text"
          value={entity.name}
          onChange={(e) => onUpdate({ ...entity, name: e.target.value })}
          className="bg-transparent font-bold text-lg w-full outline-none"
          placeholder="Entity Name"
        />
      </div>

      {/* Attributes */}
      <div className="p-2">
        {entity.attributes.map((attribute, index) => (
          <div
            key={attribute.id}
            className="flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded group"
          >
            <input
              type="checkbox"
              checked={attribute.isPK}
              onChange={(e) => handleAttributeChange(attribute.id, 'isPK', e.target.checked)}
              className="w-4 h-4"
              title="Primary Key"
            />
            <Key size={14} className="text-yellow-600" />
            
            <input
              type="text"
              value={attribute.name}
              onChange={(e) => handleAttributeChange(attribute.id, 'name', e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, attribute.id)}
              className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:border-blue-400"
              placeholder="Attribute name"
            />
            
            <select
              value={attribute.type}
              onChange={(e) => handleAttributeChange(attribute.id, 'type', e.target.value)}
              className="px-2 py-1 text-sm border border-gray-200 rounded outline-none focus:border-blue-400"
            >
              <option value="INT">INT</option>
              <option value="VARCHAR">VARCHAR</option>
              <option value="TEXT">TEXT</option>
              <option value="DATE">DATE</option>
              <option value="DATETIME">DATETIME</option>
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="DECIMAL">DECIMAL</option>
            </select>
            
            <button
              onClick={() => handleDeleteAttribute(attribute.id)}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-opacity"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        
        {/* Add new attribute */}
        <div className="flex items-center gap-2 py-1 px-2">
          <div className="w-4 h-4" />
          <Key size={14} className="text-gray-400" />
          
          <input
            ref={lastAttributeRef}
            type="text"
            value={newAttributeName}
            onChange={(e) => setNewAttributeName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e)}
            onBlur={handleAddAttribute}
            className="flex-1 px-2 py-1 text-sm border border-dashed border-gray-300 rounded outline-none focus:border-blue-400"
            placeholder="New attribute (Tab to add)"
          />
          
          <select className="px-2 py-1 text-sm border border-dashed border-gray-300 rounded outline-none text-gray-400">
            <option>Type</option>
          </select>
          
          <button
            onClick={handleAddAttribute}
            className="text-blue-500 hover:text-blue-700"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default EntityNode;
