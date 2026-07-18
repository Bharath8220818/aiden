import json
from typing import Dict, Any

class IntentParser:
    """Parse natural language queries into pipeline configurations"""
    
    def __init__(self):
        """Initialize the intent parser with predefined templates"""
        self.sources = [
            "postgres", "mysql", "snowflake", "bigquery", "s3", 
            "kafka", "csv", "json", "parquet", "mongodb", "elasticsearch"
        ]
        self.destinations = [
            "postgres", "mysql", "snowflake", "bigquery", "s3",
            "kafka", "elasticsearch", "mongodb", "redshift", "graphite"
        ]
        self.transformations = [
            "clean", "aggregate", "join", "filter", "split", 
            "deduplicate", "enrich", "pivot", "unpivot", "normalize"
        ]
    
    async def parse(self, query: str) -> Dict[str, Any]:
        """
        Parse natural language query into structured pipeline config
        
        Args:
            query: Natural language description of the pipeline
            
        Returns:
            Dictionary with pipeline configuration
        """
        query_lower = query.lower()
        
        # Extract name
        name = self._extract_name(query)
        
        # Extract source and destination
        source_type = self._find_type(query_lower, self.sources, "source")
        destination_type = self._find_type(query_lower, self.destinations, "destination")
        
        # Extract transformations
        transformations = self._find_transformations(query_lower)
        
        # Extract schedule
        schedule = self._extract_schedule(query_lower)
        
        # Extract data quality rules
        rules = self._extract_rules(query_lower)
        
        return {
            "name": name,
            "source_type": source_type or "postgres",
            "source_config": {},
            "destination_type": destination_type or "snowflake",
            "destination_config": {},
            "transformations": transformations,
            "schedule": schedule,
            "data_quality_rules": rules
        }
    
    def _extract_name(self, query: str) -> str:
        """Extract pipeline name from query"""
        words = query.split()
        if len(words) > 3:
            return " ".join(words[:min(4, len(words))]).title()
        return "Data Pipeline"
    
    def _find_type(self, query: str, types: list, type_name: str) -> str:
        """Find type (source or destination) in query"""
        for t in types:
            if t in query:
                return t
        return None
    
    def _find_transformations(self, query: str) -> list:
        """Extract transformation operations from query"""
        found = []
        for transform in self.transformations:
            if transform in query:
                found.append(transform)
        return found or ["clean", "aggregate"]
    
    def _extract_schedule(self, query: str) -> str:
        """Extract schedule from query"""
        if "daily" in query or "day" in query:
            return "0 6 * * *"  # 6 AM daily
        elif "hourly" in query or "hour" in query:
            return "0 * * * *"  # Every hour
        elif "weekly" in query or "week" in query:
            return "0 6 * * 0"  # 6 AM Sunday
        elif "monthly" in query or "month" in query:
            return "0 6 1 * *"  # 6 AM first day
        return "0 6 * * *"  # Default: daily
    
    def _extract_rules(self, query: str) -> list:
        """Extract data quality rules from query"""
        rules = []
        if "null" in query or "missing" in query:
            rules.append("no_null_primary_key")
        if "duplicate" in query or "unique" in query:
            rules.append("check_uniqueness")
        if "range" in query or "valid" in query:
            rules.append("validate_ranges")
        return rules or []
