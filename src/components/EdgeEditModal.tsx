import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Relationship } from '../types/erd';

interface EdgeEditModalProps {
    relationship: Relationship;
    sourceEntityName: string;
    targetEntityName: string;
    onSave: (updatedRelationship: Relationship) => void;
    onDelete: () => void;
    onClose: () => void;
}

const EdgeEditModal: React.FC<EdgeEditModalProps> = ({
    relationship,
    sourceEntityName,
    targetEntityName,
    onSave,
    onDelete,
    onClose,
}) => {
    const [type, setType] = useState<'1:1' | '1:N' | 'N:M'>(relationship.type);

    const handleSave = () => {
        onSave({
            ...relationship,
            type,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Edit Relationship</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="text-sm text-gray-600 mb-2">Connection</div>
                        <div className="font-semibold text-gray-800">
                            {sourceEntityName} → {targetEntityName}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Relationship Type
                        </label>
                        <div className="space-y-2">
                            {(['1:1', '1:N', 'N:M'] as const).map((relType) => (
                                <label
                                    key={relType}
                                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${type === relType
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="relationship-type"
                                        value={relType}
                                        checked={type === relType}
                                        onChange={(e) => setType(e.target.value as '1:1' | '1:N' | 'N:M')}
                                        className="w-4 h-4 text-blue-500"
                                    />
                                    <span className="ml-3 font-medium text-gray-800">
                                        {relType}
                                    </span>
                                    <span className="ml-auto text-sm text-gray-500">
                                        {relType === '1:1' && 'One to One'}
                                        {relType === '1:N' && 'One to Many'}
                                        {relType === 'N:M' && 'Many to Many'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onDelete}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                        Delete Relationship
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EdgeEditModal;
