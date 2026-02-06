import { create } from 'zustand';
import { Entity, Relationship, ERDData, Attribute } from '../types/erd';

interface ERDStore {
  entities: Entity[];
  relationships: Relationship[];
  selectedEntity: string | null;
  
  // Entity actions
  addEntity: (entity: Entity) => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  deleteEntity: (id: string) => void;
  
  // Attribute actions
  addAttribute: (entityId: string, attribute: Attribute) => void;
  updateAttribute: (entityId: string, attributeId: string, updates: Partial<Attribute>) => void;
  deleteAttribute: (entityId: string, attributeId: string) => void;
  
  // Relationship actions
  addRelationship: (relationship: Relationship) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;
  
  // Selection
  setSelectedEntity: (id: string | null) => void;
  
  // Export/Import
  exportData: () => ERDData;
  importData: (data: ERDData) => void;
}

export const useERDStore = create<ERDStore>((set, get) => ({
  entities: [],
  relationships: [],
  selectedEntity: null,

  addEntity: (entity) => set((state) => ({
    entities: [...state.entities, entity]
  })),

  updateEntity: (id, updates) => set((state) => ({
    entities: state.entities.map(entity =>
      entity.id === id ? { ...entity, ...updates } : entity
    )
  })),

  deleteEntity: (id) => set((state) => ({
    entities: state.entities.filter(entity => entity.id !== id),
    relationships: state.relationships.filter(rel => 
      rel.source !== id && rel.target !== id
    )
  })),

  addAttribute: (entityId, attribute) => set((state) => ({
    entities: state.entities.map(entity =>
      entity.id === entityId
        ? { ...entity, attributes: [...entity.attributes, attribute] }
        : entity
    )
  })),

  updateAttribute: (entityId, attributeId, updates) => set((state) => ({
    entities: state.entities.map(entity =>
      entity.id === entityId
        ? {
            ...entity,
            attributes: entity.attributes.map(attr =>
              attr.id === attributeId ? { ...attr, ...updates } : attr
            )
          }
        : entity
    )
  })),

  deleteAttribute: (entityId, attributeId) => set((state) => ({
    entities: state.entities.map(entity =>
      entity.id === entityId
        ? {
            ...entity,
            attributes: entity.attributes.filter(attr => attr.id !== attributeId)
          }
        : entity
    )
  })),

  addRelationship: (relationship) => set((state) => ({
    relationships: [...state.relationships, relationship]
  })),

  updateRelationship: (id, updates) => set((state) => ({
    relationships: state.relationships.map(rel =>
      rel.id === id ? { ...rel, ...updates } : rel
    )
  })),

  deleteRelationship: (id) => set((state) => ({
    relationships: state.relationships.filter(rel => rel.id !== id)
  })),

  setSelectedEntity: (id) => set({ selectedEntity: id }),

  exportData: () => {
    const { entities, relationships } = get();
    return { entities, relationships };
  },

  importData: (data) => set({
    entities: data.entities,
    relationships: data.relationships
  })
}));
