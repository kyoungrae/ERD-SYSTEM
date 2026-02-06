import { create } from 'zustand';
import type { Entity, Relationship, ERDState } from '../types/erd';

interface ERDStore extends ERDState {
    addEntity: (entity: Entity) => void;
    updateEntity: (id: string, entity: Partial<Entity>) => void;
    deleteEntity: (id: string) => void;
    addRelationship: (relationship: Relationship) => void;
    updateRelationship: (id: string, updates: Partial<Relationship>) => void;
    deleteRelationship: (id: string) => void;
    exportData: () => ERDState;
    importData: (data: ERDState) => void;
    mergeData: (data: ERDState, overwrite?: boolean) => void;
}

export const useERDStore = create<ERDStore>((set, get) => ({
    entities: [],
    relationships: [],

    addEntity: (entity) =>
        set((state) => ({
            entities: [...state.entities, entity],
        })),

    updateEntity: (id, updates) =>
        set((state) => ({
            entities: state.entities.map((e) =>
                e.id === id ? { ...e, ...updates } : e
            ),
        })),

    deleteEntity: (id) =>
        set((state) => ({
            entities: state.entities.filter((e) => e.id !== id),
            relationships: state.relationships.filter(
                (r) => r.source !== id && r.target !== id
            ),
        })),

    addRelationship: (relationship) =>
        set((state) => ({
            relationships: [...state.relationships, relationship],
        })),

    updateRelationship: (id, updates) =>
        set((state) => ({
            relationships: state.relationships.map((r) =>
                r.id === id ? { ...r, ...updates } : r
            ),
        })),

    deleteRelationship: (id) =>
        set((state) => ({
            relationships: state.relationships.filter((r) => r.id !== id),
        })),

    exportData: () => {
        const state = get();
        return {
            entities: state.entities,
            relationships: state.relationships,
        };
    },

    importData: (data) =>
        set({
            entities: data.entities,
            relationships: data.relationships,
        }),

    mergeData: (data, overwrite = false) =>
        set((state) => {
            let newEntities = [...state.entities];
            let newRelationships = [...state.relationships];

            data.entities.forEach((newEntity) => {
                const existingIndex = newEntities.findIndex(
                    (e) => e.name.toLowerCase() === newEntity.name.toLowerCase()
                );

                if (existingIndex !== -1) {
                    if (overwrite) {
                        // Replace existing entity
                        const oldId = newEntities[existingIndex].id;
                        newEntities[existingIndex] = { ...newEntity };

                        // Clean up relationships for the old ID if ID changed (though parser uses new IDs)
                        // Actually, if we overwrite, we should probably keep the new ID but update relationships.
                        // But wait, relationships in 'data' are already linked to 'newEntity.id'.
                        newRelationships = newRelationships.filter(
                            (r) => r.source !== oldId && r.target !== oldId
                        );
                    } else {
                        // Skip if not overwriting
                        return;
                    }
                } else {
                    // Add as new
                    newEntities.push(newEntity);
                }
            });

            // Add new relationships, preventing duplicates
            data.relationships.forEach((newRel) => {
                const exists = newRelationships.some(
                    (r) =>
                        (r.source === newRel.source &&
                            r.target === newRel.target &&
                            r.sourceHandle === newRel.sourceHandle &&
                            r.targetHandle === newRel.targetHandle) ||
                        (r.id === newRel.id)
                );
                if (!exists) {
                    newRelationships.push(newRel);
                }
            });

            return {
                entities: newEntities,
                relationships: newRelationships,
            };
        }),
}));
