export interface Problem {
  id: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  company: string;
  category: 'SQL' | 'Python' | 'PySpark' | 'Window Functions';
  description: string;
  inputSchema: string;
  outputSchema: string;
  constraints: string;
  solved: boolean;
  solution?: string;
  testCases: TestCase[];
}

export interface TestCase {
  id: number;
  input: string;
  expected: string;
  description?: string;
}

export interface Submission {
  id: number;
  problemId: number;
  code: string;
  language: 'sql' | 'python' | 'pyspark';
  status: 'pending' | 'passing' | 'failing' | 'error';
  results: TestResult[];
  submittedAt: string;
  executionTime?: number;
}

export interface TestResult {
  testCaseId: number;
  passed: boolean;
  actual: string;
  error?: string;
}

export interface CodeExecution {
  id: string;
  output: string;
  error?: string;
  executionTime: number;
  status: 'success' | 'error' | 'timeout';
}
