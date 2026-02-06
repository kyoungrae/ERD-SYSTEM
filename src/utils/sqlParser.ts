import type { Entity, Attribute, Relationship } from '../types/erd';

export const parseSQLToERD = (sql: string): { entities: Entity[], relationships: Relationship[] } => {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Normalize SQL: remove comments and extra whitespace
    const cleanSql = sql
        .replace(/\/\*[\s\S]*?\*\/|--.*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Split by semicolons for multiple statements
    const statements = cleanSql.split(';').map(s => s.trim()).filter(Boolean);

    statements.forEach(statement => {
        // Handle CREATE TABLE
        const createMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([^\s(]+)\s*\(([\s\S]*)\)/i);
        if (createMatch) {
            const tableName = createMatch[1].replace(/[`"\[\]]/g, '');
            const body = createMatch[2];

            const attributes: Attribute[] = [];
            // Basic column split (handle nested parentheses for types like DECIMAL(10,2))
            let depth = 0;
            let current = '';
            const columns: string[] = [];

            for (let i = 0; i < body.length; i++) {
                if (body[i] === '(') depth++;
                if (body[i] === ')') depth--;
                if (body[i] === ',' && depth === 0) {
                    columns.push(current.trim());
                    current = '';
                } else {
                    current += body[i];
                }
            }
            if (current) columns.push(current.trim());

            columns.forEach(col => {
                const parts = col.split(/\s+/);
                if (parts[0].toUpperCase() === 'CONSTRAINT' || parts[0].toUpperCase() === 'PRIMARY' || parts[0].toUpperCase() === 'FOREIGN') {
                    // Handle table-level constraints if needed (simplified for now)
                    return;
                }

                const colName = parts[0].replace(/[`"\[\]]/g, '');
                const colType = parts[1] || 'VARCHAR(255)';
                const isPK = col.toUpperCase().includes('PRIMARY KEY');
                const isNullable = !col.toUpperCase().includes('NOT NULL');

                attributes.push({
                    id: `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: colName,
                    type: colType.toUpperCase(),
                    isPK,
                    isFK: false,
                    isNullable
                });
            });

            entities.push({
                id: `entity_${Date.now()}_${entities.length}`,
                name: tableName,
                position: {
                    x: 100 + (entities.length * 350) % 1000,
                    y: 100 + Math.floor(entities.length / 3) * 400
                },
                attributes,
                isLocked: true
            });
        }

        // Handle ALTER TABLE for Foreign Keys (simplified)
        const fkMatch = statement.match(/ALTER TABLE\s+([^\s]+)\s+ADD\s+CONSTRAINT\s+[^\s]+\s+FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
        if (fkMatch) {
            const sourceTable = fkMatch[1].replace(/[`"\[\]]/g, '');
            const targetTable = fkMatch[3].replace(/[`"\[\]]/g, '');

            const sourceEntity = entities.find(e => e.name === sourceTable);
            const targetEntity = entities.find(e => e.name === targetTable);

            if (sourceEntity && targetEntity) {
                relationships.push({
                    id: `rel_${Date.now()}_${relationships.length}`,
                    source: sourceEntity.id,
                    target: targetEntity.id,
                    type: '1:N'
                });
            }
        }
    });

    return { entities, relationships };
};
