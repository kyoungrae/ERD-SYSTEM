import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { Entity, Attribute } from '../types/erd';
import { Database, Key, Link, Plus, Trash2, X, Lock, Unlock, MessageSquare } from 'lucide-react';
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


    return (
        <div
            className={`bg-white rounded-lg shadow-xl border-2 transition-all min-w-[300px] group relative overflow-hidden ${isLocked ? 'border-gray-200 shadow-sm' : 'border-blue-500 shadow-blue-100'}`}
        >
            {/* Locking Mask Overlay */}
            {isLocked && (
                <div
                    onDoubleClick={handleToggleLock}
                    className="absolute inset-0 z-[100] flex items-center justify-center cursor-pointer group/mask hover:bg-white/30 transition-all duration-300"
                    title="더블 클릭하여 잠금 해제"
                >
                    <div className="bg-white/90 p-3 rounded-full shadow-lg border border-gray-100 opacity-0 group-hover/mask:opacity-100 transition-all transform scale-90 group-hover/mask:scale-100 flex flex-col items-center gap-1">
                        <Lock size={20} className="text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Double Click to Edit</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={`px-4 py-2 flex items-center gap-2 text-white ${isLocked ? 'bg-gray-400' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}>
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

            {/* Table Comment Area */}
            {(!isLocked || entity.comment) && (
                <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <MessageSquare size={12} className="text-gray-400 shrink-0" />
                    <input
                        type="text"
                        value={entity.comment || ''}
                        onChange={(e) => updateEntity(entity.id, { comment: e.target.value })}
                        onMouseDown={(e) => !isLocked && e.stopPropagation()}
                        disabled={isLocked}
                        className={`text-[11px] w-full bg-transparent border-none focus:ring-0 p-0 outline-none italic placeholder-gray-300 ${isLocked ? 'text-gray-400' : 'text-blue-600 focus:bg-white transition-colors'}`}
                        placeholder="테이블 설명 추가..."
                        spellCheck={false}
                    />
                </div>
            )}

            {/* Attributes */}
            <div className="p-2 space-y-1">
                {entity.attributes.map((attr) => (
                    <div
                        key={attr.id}
                        className={`flex items-center gap-1 py-1 px-2 rounded group/attr transition-colors relative cursor-default ${!isLocked ? 'hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                        {/* PK Icon/Toggle - Fixed Width Column */}
                        <div className="w-8 flex-shrink-0 flex justify-center">
                            <div className="relative group/tooltip">
                                <button
                                    onClick={(e) => handleUpdateAttribute(e, attr.id, { isPK: !attr.isPK })}
                                    onMouseDown={(e) => !isLocked && e.stopPropagation()}
                                    disabled={isLocked}
                                    className={`${!isLocked ? 'nodrag' : 'pointer-events-auto cursor-grab'} p-1 rounded transition-colors ${attr.isPK ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-gray-400'}`}
                                >
                                    <Key size={14} />
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-50">
                                    <div className="bg-gray-800/90 backdrop-blur-sm text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-white/10">
                                        <span className={`w-1 h-1 rounded-full animate-pulse ${attr.isPK ? 'bg-yellow-400' : 'bg-gray-400'}`} />
                                        {attr.isPK ? "기본키 (PK)" : "기본키로 설정"}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-800/90" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Name Input - Flexible Space */}
                        <div className="flex-1 min-w-0 mx-1">
                            <input
                                type="text"
                                value={attr.name}
                                onChange={(e) => handleUpdateAttribute(e as any, attr.id, { name: e.target.value })}
                                onMouseDown={(e) => !isLocked && e.stopPropagation()}
                                disabled={isLocked}
                                className={`${!isLocked ? 'nodrag bg-blue-50/50 hover:bg-blue-50 focus:bg-white' : 'bg-transparent pointer-events-none'} w-full border-none focus:ring-1 focus:ring-blue-100 text-sm outline-none px-1.5 py-0.5 rounded transition-all ${attr.isPK ? 'font-bold underline text-blue-900 underground-pk' : 'text-gray-700'} disabled:text-gray-600`}
                                placeholder="컬럼 명"
                                spellCheck={false}
                            />
                        </div>

                        {/* Metadata Columns Wrapper - Structured and Aligned */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* 1. Type Column (Fixed Width) */}
                            <div className="w-16 flex-shrink-0">
                                <select
                                    value={attr.type}
                                    onChange={(e) => handleUpdateAttribute(e as any, attr.id, { type: e.target.value })}
                                    onMouseDown={(e) => !isLocked && e.stopPropagation()}
                                    disabled={isLocked}
                                    className={`bg-transparent border-none focus:ring-0 text-[10px] outline-none w-full appearance-none transition-colors ${!isLocked ? 'nodrag text-blue-600 hover:text-blue-800 cursor-pointer' : 'text-gray-400 pointer-events-none'}`}
                                >
                                    <option value="INT">INT</option>
                                    <option value="BIGINT">BIGINT</option>
                                    <option value="VARCHAR(255)">VARCHAR</option>
                                    <option value="TEXT">TEXT</option>
                                    <option value="BOOLEAN">BOOL</option>
                                    <option value="DATE">DATE</option>
                                    <option value="DATETIME">DATETIME</option>
                                </select>
                            </div>

                            {/* 2. NN Toggle Column (Fixed Width) */}
                            <div className="w-12 flex-shrink-0 flex items-center justify-center gap-1">
                                <div className="flex items-center gap-1 group/nn">
                                    <button
                                        onClick={(e) => handleUpdateAttribute(e, attr.id, { isNullable: !attr.isNullable })}
                                        disabled={isLocked}
                                        className={`relative w-6 h-3.5 rounded-full transition-colors flex items-center px-0.5 ${!attr.isNullable ? 'bg-red-500' : 'bg-gray-200'} ${isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
                                        title={!attr.isNullable ? "Not Null" : "Nullable"}
                                    >
                                        <div className={`w-2.5 h-2.5 bg-white rounded-full transition-transform shadow-sm ${!attr.isNullable ? 'translate-x-2.5' : 'translate-x-0'}`} />
                                    </button>
                                    <span className={`text-[8px] font-black tracking-tighter ${!attr.isNullable ? 'text-red-500' : 'text-gray-300 opacity-0 group-hover/nn:opacity-100 transition-opacity whitespace-nowrap'}`}>
                                        NN
                                    </span>
                                </div>
                            </div>

                            {/* 3. Comment Column (Semi-fixed Width) */}
                            <div className="w-24 flex-shrink-0 flex items-center gap-1 group/cmt bg-gray-50/30 px-1 rounded transition-all hover:bg-gray-50">
                                <MessageSquare
                                    size={11}
                                    className={`shrink-0 transition-colors ${attr.comment ? 'text-blue-400' : 'text-gray-200 group-hover/cmt:text-gray-400'}`}
                                />
                                {(!isLocked || attr.comment) && (
                                    <input
                                        type="text"
                                        value={attr.comment || ''}
                                        onChange={(e) => handleUpdateAttribute(e as any, attr.id, { comment: e.target.value })}
                                        onMouseDown={(e) => !isLocked && e.stopPropagation()}
                                        disabled={isLocked}
                                        className={`text-[9px] bg-transparent border-none focus:ring-0 p-0 outline-none italic placeholder-gray-300 w-full transition-all ${isLocked ? 'text-gray-400' : 'text-blue-500'}`}
                                        placeholder="설명..."
                                        spellCheck={false}
                                    />
                                )}
                            </div>

                            {/* 4. FK Column (Fixed Width) */}
                            <div className="w-8 flex-shrink-0 flex justify-center">
                                <div className="relative group/tooltip">
                                    <button
                                        onClick={(e) => handleUpdateAttribute(e, attr.id, { isFK: !attr.isFK })}
                                        onMouseDown={(e) => !isLocked && e.stopPropagation()}
                                        disabled={isLocked}
                                        className={`${!isLocked ? 'nodrag' : 'pointer-events-auto cursor-grab'} p-1 rounded transition-colors ${attr.isFK ? 'text-purple-500 bg-purple-50' : 'text-gray-300'}`}
                                    >
                                        <Link size={14} />
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 translate-y-1 group-hover/tooltip:translate-y-0 z-50">
                                        <div className="bg-gray-800/90 backdrop-blur-sm text-white text-[10px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-white/10">
                                            <span className={`w-1 h-1 rounded-full animate-pulse ${attr.isFK ? 'bg-purple-400' : 'bg-gray-400'}`} />
                                            {attr.isFK ? "외래키 (FK)" : "외래키로 설정"}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-gray-800/90" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Delete Column - Only visible on hover if unlocked */}
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
                    </div>
                ))}
            </div>

            {/* Add Attribute Button */}
            {
                !isLocked && (
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
                )
            }

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
        </div >
    );
};

export default memo(EntityNode);
