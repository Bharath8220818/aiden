from pydantic import BaseModel
from typing import Optional, List, Any

class ColumnDefinition(BaseModel):
    name: str
    type: str
    primary_key: bool = False
    foreign_key: Optional[str] = None
    nullable: bool = True
    default_value: Optional[str] = None

class TableDefinition(BaseModel):
    name: str
    type: str = "fact"  # "fact", "dimension", "bridge"
    columns: List[ColumnDefinition] = []

class SchemaGenerateRequest(BaseModel):
    prompt: str
    schema_type: Optional[str] = "star"  # "star", "snowflake", "3nf"

class SchemaValidateRequest(BaseModel):
    tables: List[TableDefinition] = []

class SchemaResponse(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    tables: List[TableDefinition] = []
    schema_type: str = "star"
    ddl: Optional[str] = None
    errors: List[str] = []
    warnings: List[str] = []

class DDLResponse(BaseModel):
    success: bool
    ddl: str
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
