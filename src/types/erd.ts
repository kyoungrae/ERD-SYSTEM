export interface Attribute {
  id: string;
  name: string;
  type: string;
  isPK: boolean;
  isFK: boolean;
}

export interface Entity {
  id: string;
  name: string;
  position: { x: number; y: number };
  attributes: Attribute[];
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: '1:1' | '1:N' | 'N:M';
}

export interface ERDData {
  entities: Entity[];
  relationships: Relationship[];
}
