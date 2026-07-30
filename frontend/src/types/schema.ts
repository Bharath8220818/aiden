export interface Column {
  name: string;
  type: string;
  primaryKey: boolean;
  foreignKey?: string;
  nullable: boolean;
  defaultValue?: string;
  description?: string;
}

export interface Table {
  id: string;
  name: string;
  type: 'fact' | 'dimension' | 'bridge';
  color: string;
  x: number;
  y: number;
  columns: Column[];
}

export interface Relationship {
  id: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
}

export interface SchemaModel {
  id: string;
  name: string;
  tables: Table[];
  relationships: Relationship[];
  schemaType: 'star' | 'snowflake' | '3nf' | 'vault';
  description?: string;
  ddl?: string;
}

export interface DDLResult {
  success: boolean;
  ddl: string;
  errors?: string[];
  warnings?: string[];
}
