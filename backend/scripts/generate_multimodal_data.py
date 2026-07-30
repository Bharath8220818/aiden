"""
Generate synthetic pipeline diagram + text data for multimodal training.
Creates JSONL dataset with image paths, prompts, and completions.
"""

import json
import os
import random
from pathlib import Path


class PipelineDiagramGenerator:
    """Generate synthetic pipeline diagrams with metadata"""

    def __init__(self, output_dir: str = "backend/data/training"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.source_types = ["postgres", "mysql", "snowflake", "kafka", "s3", "mongodb", "bigquery"]
        self.destination_types = ["snowflake", "bigquery", "postgres", "redshift", "s3", "mongodb"]
        self.transformations = ["clean", "aggregate", "join", "filter", "enrich", "validate", "deduplicate"]
        self.schedules = ["daily", "hourly", "weekly", "real-time"]

    def generate_sample(self, idx: int) -> dict:
        """Generate a single synthetic sample"""

        source = random.choice(self.source_types)
        destination = random.choice(self.destination_types)
        transforms = random.sample(self.transformations, k=random.randint(1, 4))
        schedule = random.choice(self.schedules)

        prompt = f"Explain this {source} to {destination} pipeline that runs {schedule}."
        completion = (
            f"This is a pipeline that extracts data from {source}, "
            f"applies {', '.join(transforms)} transformations, "
            f"and loads it into {destination} on a {schedule} schedule."
        )

        return {
            "image": f"diagram_{idx:04d}.png",
            "prompt": prompt,
            "completion": completion,
            "metadata": {
                "source": source,
                "destination": destination,
                "transformations": transforms,
                "schedule": schedule,
            },
        }

    def generate_dataset(self, count: int = 200):
        """Generate full dataset"""

        data = []
        for i in range(count):
            data.append(self.generate_sample(i))

        output_path = self.output_dir / "multimodal_dataset.jsonl"
        with open(output_path, 'w') as f:
            for item in data:
                f.write(json.dumps(item) + '\n')

        print(f"Generated {len(data)} samples to {output_path}")
        return data


if __name__ == "__main__":
    generator = PipelineDiagramGenerator()
    generator.generate_dataset(200)
    print("\nSample:")
    print(json.dumps(generator.generate_sample(0), indent=2))
