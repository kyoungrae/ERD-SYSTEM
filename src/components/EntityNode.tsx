import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { Entity, Attribute } from '../types/erd';
import { Database, Key, Link, Plus, Trash2, X, Lock, Unlock } from 'lucide-react';
import { useERDStore } from '../store/erdStore';

interface EntityNodeData {
    entity: Entity;
}

const EntityNode: React.FC<NodeProps<EntityNodeData>> = ({ data }) => {
    const { entity } = data;
    const { updateEntity, deleteEntity } = useERDStore();
    const isLocked = entity.isLocked ?? true; // Default to locked

    const handleNameChange = (newName: string) => {
        if (isLocked) return;
        updateEntity(entity.id, { name: newName });
    };

    const handleToggleLock = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateEntity(entity.id, { isLocked: !isLocked });
    };

    const handleAddAttribute = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isLocked) return;
        const newAttr: Attribute = {
            id: `attr_${Date.now()}`,
            name: 'new_column',
            type: 'VARCHAR(255)',
            isPK: false,
            isFK: false,
            isNullable: true,
        };
        updateEntity(entity.id, {
            attributes: [...entity.attributes, newAttr],
        });
    };

    const handleUpdateAttribute = (e: React.MouseEvent | React.ChangeEvent, attrId: string, updates: Partial<Attribute>) => {
        if (isLocked) return;
        e.stopPropagation();
        const newAttributes = entity.attributes.map((attr) =>
            attr.id === attrId ? { ...attr, ...updates } : attr
        );
        updateEntity(entity.id, { attributes: newAttributes });
    };

    const handleDeleteAttribute = (e: React.MouseEvent, attrId: string) => {
        e.stopPropagation();
        if (isLocked) return;
        const newAttributes = entity.attributes.filter((attr) => attr.id !== attrId);
        updateEntity(entity.id, { attributes: newAttributes });
    };

    const handleDeleteEntity = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Delete entity "${entity.name}"?`)) {
            deleteEntity(entity.id);
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (isLocked) {
            e.stopPropagation();
            updateEntity(entity.id, { isLocked: false });
        }
    };

    return (
        <div
            onDoubleClick={handleDoubleClick}
            className={`bg-white rounded-lg shadow-xl border-2 transition-all min-w-[300px] group ${isLocked ? 'border-gray-300 cursor-grab active:cursor-grabbing' : 'border-blue-500 shadow-blue-100'}`}
        >
            {/* Header */}
            <div className={`px-4 py-2 flex items-center gap-2 text-white ${isLocked ? 'bg-gradient-to-r from-gray-500 to-gray-600 cursor-grab' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
                <Database size={16} className="flex-shrink-0" />
                <input
                    type="text"
                    value={entity.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onMouseDown={(e) => !isLocked && e.stopPropagation()}
                    disabled={isLocked}
                    className={`${!isLocked ? 'nodrag bg-blue-400/20' : 'bg-transparent pointer-events-none'} border-none focus:ring-0 font-bold text-lg w-full p-0 outline-none placeholder-blue-200 rounded transition-colors disabled:text-white`}
                    placeholder="테이블 명"
                    spellCheck={false}
                />

                <div className={`flex items-center gap-1 ${isLocked ? 'pointer-events-none opacity-0 group-hover:opacity-100' : ''}`}>
                    <button
                        onClick={handleToggleLock}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="nodrag p-1 hover:bg-white/20 rounded-md transition-colors text-white pointer-events-auto"
                        title={isLocked ? "Unlock to edit" : "Lock to prevent accidental edits"}
                    >
                        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    {!isLocked && (
                        <button
                            onClick={handleDeleteEntity}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="nodrag opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500 rounded text-white"
                            title="Delete Table"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Attributes */}
            <div className="p-2 space-y-1">
                {entity.attributes.map((attr) => (
                    <div
                        key={attr.id}
                        className={`flex items-center gap-1 py-1 px-2 rounded group/attr transition-colors relative cursor-default ${!isLocked ? 'hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                        {/* PK Icon/Toggle */}
                        <div className="relative group/tooltip">
                            <button
                                onClick={(e) => handleUpdateAttribute(e, attr.id, { isPK: !attr.isPK })}
                                onMouseDown={(e) => !isLocked && e.stopPropagation()}
                                disabled={isLocked}
                                className={`${!isLocked ? 'nodrag' : 'pointer-events-auto cursor-grab'} p-1 rounded transition-colors ${attr.isPK ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300'}`}
                            >
                                <Key size={14} />
                            </button>

                            {/* 즉시 나타나는 커스텀 툴팁 */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-50">
                                <div className="bg-gray-800/90 backdrop-blur-sm text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-white/10">
                                    <span className={`w-1 h-1 rounded-full animate-pulse ${attr.isPK ? 'bg-yellow-400' : 'bg-gray-400'}`} />
                                    {attr.isPK ? "기본키 (PK)" : "기본키로 설정"}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-800/90" />
                                </div>
                            </div>
                        </div>

                        {/* Name Input */}
                        <input
                            type="text"
                            value={attr.name}
                            onChange={(e) => handleUpdateAttribute(e as any, attr.id, { name: e.target.value })}
                            onMouseDown={(e) => !isLocked && e.stopPropagation()}
                            disabled={isLocked}
                            className={`${!isLocked ? 'nodrag bg-blue-50' : 'bg-transparent pointer-events-none'} flex-1 border-none focus:ring-0 text-sm outline-none px-1 rounded transition-colors ${attr.isPK ? 'font-bold underline text-blue-900' : 'text-gray-700'} disabled:text-gray-600`}
                            placeholder="컬럼 명"
                            spellCheck={false}
                        />

                        {/* Type Select */}
                        <select
                            value={attr.type}
                            onChange={(e) => handleUpdateAttribute(e as any, attr.id, { type: e.target.value })}
                            onMouseDown={(e) => !isLocked && e.stopPropagation()}
                            disabled={isLocked}
                            className={`bg-transparent border-none focus:ring-0 text-[10px] outline-none w-20 appearance-none transition-colors ${!isLocked ? 'nodrag text-blue-600 hover:text-blue-800 cursor-pointer' : 'text-gray-400 pointer-events-none'}`}
                        >
                            <option value="INT">INT</option>
                            <option value="BIGINT">BIGINT</option>
                            <option value="VARCHAR(255)">VARCHAR</option>
                            <option value="TEXT">TEXT</option>
                            <option value="BOOLEAN">BOOL</option>
                            <option value="DATE">DATE</option>
                            <option value="DATETIME">DATETIME</option>
                        </select>

                        {/* FK Toggle */}
                        <div className="relative group/tooltip">
                            <button
                                onClick={(e) => handleUpdateAttribute(e, attr.id, { isFK: !attr.isFK })}
                                onMouseDown={(e) => !isLocked && e.stopPropagation()}
                                disabled={isLocked}
                                className={`${!isLocked ? 'nodrag' : 'pointer-events-auto cursor-grab'} p-1 rounded transition-colors ${attr.isFK ? 'text-purple-500 bg-purple-50' : 'text-gray-300'}`}
                            >
                                <Link size={14} />
                            </button>

                            {/* 즉시 나타나는 커스텀 툴팁 */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-50">
                                <div className="bg-gray-800/90 backdrop-blur-sm text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-white/10">
                                    <span className={`w-1 h-1 rounded-full animate-pulse ${attr.isFK ? 'bg-purple-400' : 'bg-gray-400'}`} />
                                    {attr.isFK ? "외래키 (FK)" : "외래키로 설정"}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-800/90" />
                                </div>
                            </div>
                        </div>

                        {/* Delete Attr */}
                        {!isLocked && (
                            <button
                                onClick={(e) => handleDeleteAttribute(e, attr.id)}
                                onMouseDown={(e) => e.stopPropagation()}
                                className="nodrag opacity-0 group-attr/attr:opacity-100 transition-opacity p-1 text-red-300 hover:text-red-500"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Add Attribute Button */}
            {!isLocked && (
                <div className="px-2 pb-2">
                    <button
                        onClick={handleAddAttribute}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="nodrag w-full flex items-center justify-center gap-2 py-1.5 border-2 border-dashed border-gray-200 rounded text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all text-xs font-medium"
                    >
                        <Plus size={14} />
                        컬럼 추가
                    </button>
                </div>
            )}

            {/* Handles for connections */}
            <Handle
                type="source"
                position={Position.Top}
                id="top"
                className="!bg-transparent !border-none !w-5 !h-5 flex items-center justify-center !cursor-pointer group/handle"
                style={{ top: -10 }}
            >
                <div className="w-2 h-2 bg-blue-500 border-white border-2 rounded-full transition-all duration-200 shadow-sm pointer-events-none group-hover/handle:bg-green-500 group-hover/handle:scale-150" />
            </Handle>
            <Handle
                type="source"
                position={Position.Bottom}
                id="bottom"
                className="!bg-transparent !border-none !w-5 !h-5 flex items-center justify-center !cursor-pointer group/handle"
                style={{ bottom: -10 }}
            >
                <div className="w-2 h-2 bg-blue-500 border-white border-2 rounded-full transition-all duration-200 shadow-sm pointer-events-none group-hover/handle:bg-green-500 group-hover/handle:scale-150" />
            </Handle>
            <Handle
                type="source"
                position={Position.Left}
                id="left"
                className="!bg-transparent !border-none !w-5 !h-5 flex items-center justify-center !cursor-pointer group/handle"
                style={{ left: -10 }}
            >
                <div className="w-2 h-2 bg-blue-500 border-white border-2 rounded-full transition-all duration-200 shadow-sm pointer-events-none group-hover/handle:bg-green-500 group-hover/handle:scale-150" />
            </Handle>
            <Handle
                type="source"
                position={Position.Right}
                id="right"
                className="!bg-transparent !border-none !w-5 !h-5 flex items-center justify-center !cursor-pointer group/handle"
                style={{ right: -10 }}
            >
                <div className="w-2 h-2 bg-blue-500 border-white border-2 rounded-full transition-all duration-200 shadow-sm pointer-events-none group-hover/handle:bg-green-500 group-hover/handle:scale-150" />
            </Handle>
        </div>
    );
};

export default memo(EntityNode);
