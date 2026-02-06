export interface Attribute {
    id: string;
    name: string;
    type: string;
    isPK: boolean;
    isFK: boolean;
    isNullable?: boolean;
    defaultVal?: string;
    comment?: string;
}

export interface Entity {
    id: string;
    name: string;
    position: { x: number; y: number };
    attributes: Attribute[];
    isLocked?: boolean;
    comment?: string;
}

export interface Relationship {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    type: '1:1' | '1:N' | 'N:M';
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    updatedAt: string;
    data: ERDState;
}

export interface ERDState {
    entities: Entity[];
    relationships: Relationship[];
}
