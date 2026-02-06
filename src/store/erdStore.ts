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
}));
