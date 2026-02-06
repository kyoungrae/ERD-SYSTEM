import type { Entity, Attribute, Relationship } from '../types/erd';

export const parseSQLToERD = (sql: string): { entities: Entity[], relationships: Relationship[] } => {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Normalize SQL: remove comments and extra whitespace
    const cleanSql = sql
        .replace(/\/\*[\s\S]*?\*\/|--.*/g, '') // Remove block and line comments
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

            // Collect relationships to be added after entities are fully parsed
            const tableLevelFKs: { col: string, refTable: string, refCol: string }[] = [];

            // Split body into column/constraint definitions
            let depth = 0;
            let current = '';
            const sections: string[] = [];

            for (let i = 0; i < body.length; i++) {
                if (body[i] === '(') depth++;
                if (body[i] === ')') depth--;
                if (body[i] === ',' && depth === 0) {
                    sections.push(current.trim());
                    current = '';
                } else {
                    current += body[i];
                }
            }
            if (current) sections.push(current.trim());

            sections.forEach(section => {
                const upperSection = section.toUpperCase();

                // Handle Table-level PRIMARY KEY
                if (upperSection.startsWith('PRIMARY KEY')) {
                    const pkMatch = section.match(/PRIMARY KEY\s*\(([^)]+)\)/i);
                    if (pkMatch) {
                        const pkCols = pkMatch[1].split(',').map(c => c.trim().replace(/[`"\[\]]/g, ''));
                        pkCols.forEach(pkCol => {
                            const attr = attributes.find(a => a.name === pkCol);
                            if (attr) attr.isPK = true;
                        });
                    }
                    return;
                }

                // Handle Table-level FOREIGN KEY or CONSTRAINT ... FOREIGN KEY
                if (upperSection.includes('FOREIGN KEY')) {
                    const fkMatch = section.match(/(?:CONSTRAINT\s+[^\s]+\s+)?FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
                    if (fkMatch) {
                        const colName = fkMatch[1].trim().replace(/[`"\[\]]/g, '');
                        const refTable = fkMatch[2].trim().replace(/[`"\[\]]/g, '');
                        const refCol = fkMatch[3].trim().replace(/[`"\[\]]/g, '');

                        tableLevelFKs.push({ col: colName, refTable, refCol });

                        // Mark existing attribute as FK
                        const attr = attributes.find(a => a.name === colName);
                        if (attr) attr.isFK = true;
                    }
                    return;
                }

                // Handle normal column definition
                const parts = section.split(/\s+/);
                const colName = parts[0].replace(/[`"\[\]]/g, '');

                // Extract type - handle cases like VARCHAR(50)
                let colType = 'VARCHAR(255)';
                const typeMatch = section.match(/[^\s]+\s+([^\s,]+(?:\([^)]+\))?)/i);
                if (typeMatch) {
                    colType = typeMatch[1].toUpperCase();
                }

                const isPK = upperSection.includes('PRIMARY KEY');
                const isNullable = !upperSection.includes('NOT NULL');

                attributes.push({
                    id: `attr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name: colName,
                    type: colType,
                    isPK,
                    isFK: false, // Will be updated if table-level FK found
                    isNullable
                });
            });

            const newEntityId = `entity_${Date.now()}_${entities.length}`;
            entities.push({
                id: newEntityId,
                name: tableName,
                position: {
                    x: 100 + (entities.length * 350) % 1000,
                    y: 100 + Math.floor(entities.length / 3) * 400
                },
                attributes,
                isLocked: true
            });

            // If we found table-level FKs, we'll process them outside to ensure all entities exist
            // Actually, since CREATE TABLE might reference a table not yet created in the script, 
            // we should store these and process after all CREATE statements.
            (entities[entities.length - 1] as any)._pendingFKs = tableLevelFKs;
        }

        // Handle ALTER TABLE for Foreign Keys
        const fkMatch = statement.match(/ALTER TABLE\s+([^\s]+)\s+(?:ADD\s+)?(?:CONSTRAINT\s+[^\s]+\s+)?FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+([^\s(]+)\s*\(([^)]+)\)/i);
        if (fkMatch) {
            const sourceTable = fkMatch[1].replace(/[`"\[\]]/g, '');
            const sourceCol = fkMatch[2].replace(/[`"\[\]]/g, '');
            const targetTable = fkMatch[3].replace(/[`"\[\]]/g, '');

            const sourceEntity = entities.find(e => e.name === sourceTable);
            if (sourceEntity) {
                const attr = sourceEntity.attributes.find(a => a.name === sourceCol);
                if (attr) attr.isFK = true;

                relationships.push({
                    id: `rel_${Date.now()}_${relationships.length}`,
                    source: sourceTable, // Using names temporarily to resolve later or IDs if available
                    target: targetTable,
                    type: '1:N'
                });
            }
        }
    });

    // Post-process table-level FKs to create relationships
    entities.forEach(entity => {
        const pending = (entity as any)._pendingFKs;
        if (pending) {
            pending.forEach((fk: any) => {
                const targetEntity = entities.find(e => e.name === fk.refTable);
                // We create the relationship even if targetEntity isn't found in current import?
                // For now, let's only create if it exists.
                if (targetEntity) {
                    relationships.push({
                        id: `rel_${Date.now()}_${relationships.length}`,
                        source: entity.id,
                        target: targetEntity.id,
                        type: '1:N'
                    });
                }
            });
            delete (entity as any)._pendingFKs;
        }
    });

    // Fix relationships that used names instead of IDs
    relationships.forEach(rel => {
        const sourceEntity = entities.find(e => e.id === rel.source || e.name === rel.source);
        const targetEntity = entities.find(e => e.id === rel.target || e.name === rel.target);
        if (sourceEntity) rel.source = sourceEntity.id;
        if (targetEntity) rel.target = targetEntity.id;
    });

    return { entities, relationships };
};

