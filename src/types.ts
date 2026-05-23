// Shared TypeScript types for CodePilot AI

export enum Severity {
  CRITICAL = "Critical",
  HIGH = "High",
  MEDIUM = "Medium",
  LOW = "Low",
}

export interface CodeIssue {
  id: string;
  title: string;
  severity: Severity;
  filePath: string;
  fileName: string; // Backwards compatible / schema requirement
  lineRange: string;
  description: string;
  issueDetected: string; // Backwards compatible / schema requirement
  snippetBefore: string;
  snippetAfter: string;
  suggestion: string;
  suggestedFix: string; // Backwards compatible / schema requirement
  beginnerExplanation: string;
  confidence?: "High" | "Medium" | "Low";
  whyFixWorks?: string;
  resolved?: boolean;
}

export interface AnalysisSummary {
  riskScore: number;
  overallSummary: string;
  strengths: string[];
  keyRisks: string[];
}

export interface AnalysisResult {
  repositoryUrl: string;
  isPullRequest: boolean;
  analyzedFilesCount: number;
  totalPRChangedFilesCount?: number;
  estimatedCodeQualityScore?: number;
  summary: AnalysisSummary;
  bugs: CodeIssue[];
  security: CodeIssue[];
  performance: CodeIssue[];
  code_smells: CodeIssue[]; // Strictly requested schema array
  smells: CodeIssue[]; // Compatibility with the old code
  risk_score: number; // Strictly requested schema score
  summary_text?: string; // Store original schema summary string safely
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

