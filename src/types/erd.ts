// Entity types for ERD
export interface Attribute {
    id: string;
    name: string;
    type: string;
    isPK: boolean;
    isFK: boolean;
    isNullable?: boolean;
}

export interface Entity {
    id: string;
    name: string;
    position: { x: number; y: number };
    attributes: Attribute[];
    isLocked?: boolean;
}

export interface Relationship {
    id: string;
    source: string;
    target: string;
    type: '1:1' | '1:N' | 'N:M';
}

export interface ERDState {
    entities: Entity[];
    relationships: Relationship[];
}
