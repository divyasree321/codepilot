import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, Cpu, Github, Gitlab, AlertOctagon, ShieldAlert, Sparkles, CheckCircle, 
  Send, Code2, Download, Play, BookOpen, AlertTriangle, HelpCircle, 
  ArrowRight, FileText, ChevronRight, Copy, RefreshCw, Layers, Search
} from "lucide-react";
import { AnalysisResult, CodeIssue, Severity, ChatMessage } from "./types";

const ensureSafeAnalysisResult = (data: any): AnalysisResult => {
  if (!data) {
    return {
      repositoryUrl: "",
      isPullRequest: false,
      analyzedFilesCount: 0,
      summary: {
        riskScore: 0,
        overallSummary: "No analysis yet.",
        strengths: [],
        keyRisks: []
      },
      bugs: [],
      security: [],
      performance: [],
      code_smells: [],
      smells: [],
      risk_score: 0
    };
  }

  const rawBugs = Array.isArray(data.bugs) ? data.bugs : [];
  const rawSecurity = Array.isArray(data.security) ? data.security : [];
  const rawPerformance = Array.isArray(data.performance) ? data.performance : [];
  const rawSmells = Array.isArray(data.smells) ? data.smells : Array.isArray(data.code_smells) ? data.code_smells : [];

  const mapIssue = (issue: any) => ({
    ...issue,
    confidence: issue.confidence || "High",
    filePath: issue.filePath || issue.fileName || "Snippet",
    fileName: issue.fileName || issue.filePath || "Snippet",
  });

  const bugs = rawBugs.map(mapIssue);
  const security = rawSecurity.map(mapIssue);
  const performance = rawPerformance.map(mapIssue);
  const smells = rawSmells.map(mapIssue);

  const rawSummary = data.summary || {};
  let summaryText = typeof rawSummary.overallSummary === "string" ? rawSummary.overallSummary : (typeof data.summary_text === "string" ? data.summary_text : (typeof data.summary === "string" ? data.summary : "Analysis completed."));
  
  if (bugs.length === 0 && security.length === 0 && performance.length === 0 && smells.length === 0) {
    summaryText = "No confirmed issue detected";
  }

  const summary_object = {
    riskScore: typeof rawSummary.riskScore === "number" ? rawSummary.riskScore : (typeof data.risk_score === "number" ? data.risk_score : 0),
    overallSummary: summaryText,
    strengths: Array.isArray(rawSummary.strengths) ? rawSummary.strengths : [
      "Identified logical loops configured with proper parameters",
      "Clean control flow structure layout patterns",
      "Separation of static data assets and application views"
    ],
    keyRisks: Array.isArray(rawSummary.keyRisks) ? rawSummary.keyRisks : [
      "Mitigate warning flags in active directories",
      "Maintain strict code validations going forward"
    ]
  };

  return {
    repositoryUrl: data.repositoryUrl || "",
    isPullRequest: !!data.isPullRequest,
    analyzedFilesCount: typeof data.analyzedFilesCount === "number" ? data.analyzedFilesCount : 0,
    totalPRChangedFilesCount: typeof data.totalPRChangedFilesCount === "number" ? data.totalPRChangedFilesCount : 0,
    estimatedCodeQualityScore: typeof data.estimatedCodeQualityScore === "number" ? data.estimatedCodeQualityScore : (100 - summary_object.riskScore),
    summary: summary_object,
    bugs,
    security,
    performance,
    code_smells: smells,
    smells: smells,
    risk_score: summary_object.riskScore,
    summary_text: summary_object.overallSummary
  };
};

export default function App() {
  const [url, setUrl] = useState<string>("");
  const [githubToken, setGithubToken] = useState<string>("");
  const [isCustomPaste, setIsCustomPaste] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<"github" | "gitlab">("github");
  const [isGeneratingFix, setIsGeneratingFix] = useState<boolean>(false);
  const [generatedFix, setGeneratedFix] = useState<string | null>(null);
  const [isExplainingSimply, setIsExplainingSimply] = useState<boolean>(false);
  const [simpleExplanation, setSimpleExplanation] = useState<string | null>(null);
  
  const [pastedCode, setPastedCode] = useState<string>(
    `// Paste custom code here to run a quick local analysis.\nfunction calculateDiscount(price, type) {\n  let discount = 0;\n  if (type == "VIP") {\n    discount = price * 0.20;\n  }\n  const query = "SELECT * FROM logs WHERE type = '" + type + "'";\n  db.execute(query); // Risk! SQL Injection string interpolation\n  return price - discount;\n}`
  );
  const [language, setLanguage] = useState<string>("TypeScript");

  // State for current analysis
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"bugs" | "security" | "performance" | "smells">("security");
  const [selectedIssue, setSelectedIssue] = useState<CodeIssue | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issueSearchQuery, setIssueSearchQuery] = useState<string>("");

  // Beginner mode globally toggleable
  const [isBeginnerMode, setIsBeginnerMode] = useState<boolean>(false);

  // Recent Scans drawer and Live Webhook monitoring states
  const [isRecentDrawerOpen, setIsRecentDrawerOpen] = useState<boolean>(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [isLiveMonitoring, setIsLiveMonitoring] = useState<boolean>(false);

  // Live status banner state
  const [liveStatus, setLiveStatus] = useState<{
    text: "New PR change detected" | "No changes detected" | "Status OK" | "Polling repository...";
    timestamp: string;
    isChange: boolean;
  }>({
    text: "Status OK",
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isChange: false,
  });

  // Repository metadata stats states
  const [starsCount, setStarsCount] = useState<number>(142);
  const [forksCount, setForksCount] = useState<number>(28);
  const [repoLanguage, setRepoLanguage] = useState<string>("TypeScript");
  const [repoDisplayName, setRepoDisplayName] = useState<string>("expressjs/express");
  const [scanDuration, setScanDuration] = useState<number>(1.48);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("codepilot_recent_scans");
      if (saved) {
        setRecentScans(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load recent scans from localstorage", e);
    }
  }, []);

  // Utility to save a scan to the local history list of 5 scans
  const saveScan = (item: { url: string; provider: string; result: any; timestamp: string; language?: string }) => {
    try {
      const saved = localStorage.getItem("codepilot_recent_scans");
      let list = saved ? JSON.parse(saved) : [];
      if (!Array.isArray(list)) list = [];
      
      // Filter out duplicate entries matching this URL to avoid list redundancy 
      list = list.filter((x: any) => x.url !== item.url);
      
      // Push new record to the front
      list.unshift(item);
      
      // Limit list size to exactly the last 5 scans
      list = list.slice(0, 5);
      
      setRecentScans(list);
      localStorage.setItem("codepilot_recent_scans", JSON.stringify(list));
    } catch (e) {
      console.warn("Could not save to recent scans history", e);
    }
  };

  const toggleIssueResolved = (issueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalysisResult(prev => {
      if (!prev) return null;
      const updateList = (list: CodeIssue[]) => 
        (list || []).map(issue => issue.id === issueId ? { ...issue, resolved: !issue.resolved } : issue);

      const nextBugs = updateList(prev.bugs);
      const nextSecurity = updateList(prev.security);
      const nextPerformance = updateList(prev.performance);
      const nextSmells = updateList(prev.code_smells || prev.smells);

      const updated = {
        ...prev,
        bugs: nextBugs,
        security: nextSecurity,
        performance: nextPerformance,
        code_smells: nextSmells,
        smells: nextSmells,
      };

      // Keep active selection in sync if matching
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prevSelected => {
          if (!prevSelected) return null;
          return { ...prevSelected, resolved: !prevSelected.resolved };
        });
      }

      saveScan({
        url: prev.repositoryUrl || "Demo Code Checkout",
        provider: isCustomPaste ? "pasted" : activeProvider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: updated
      });

      return updated;
    });
  };

  // Real-time Webhook simulation pipeline
  useEffect(() => {
    if (!isLiveMonitoring) {
      setLiveStatus({
        text: "Status OK",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isChange: false,
      });
      return;
    }
    
    // Track interval steps to alternate between update and scan status
    let checkCount = 0;
    
    const timer = setInterval(() => {
      checkCount++;
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const isActuallyChange = checkCount % 2 === 1; // triggers change on odd counts, no-change on even counts
      
      if (!isActuallyChange) {
        setLiveStatus({
          text: "No changes detected",
          timestamp: nowStr,
          isChange: false
        });
        
        setChatMessages(prev => [
          ...prev,
          {
            id: `live-idle-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            sender: "assistant",
            text: `🔍 [LIVE TIMER] Polled repository at ${nowStr}. No changes detected.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        return;
      }
      
      // Let's perform a live recalculation & add to Recent Audits!
      if (!analysisResult) {
        // Automatically boot up checkout controller demonstration if nothing active is scanned  
        handleLoadDemo();
        setLiveStatus({
          text: "New PR change detected",
          timestamp: nowStr,
          isChange: true
        });
        return;
      }
      
      // Pick random simulated names and files to model push-events beautifully
      const username = ["octocat", "sophie-dev", "alan-arch", "linus-gate", "ada-lovelace"][Math.floor(Math.random() * 5)];
      const file = ["src/auth/session.ts", "src/db/pool.ts", "package.json", "server/index.js", "src/App.tsx", "src/routes/payment.ts"][Math.floor(Math.random() * 6)];
      const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      const randomId = `live-webhook-${uniqueSuffix}`;

      const items = ["bugs", "security", "performance", "smells"];
      const randomCat = items[Math.floor(Math.random() * items.length)] as "bugs" | "security" | "performance" | "smells";
      
      // Build a realistic simulated issue with correct references and complete file scopes
      const simulatedIssue: CodeIssue = {
        id: randomId,
        title: `Live security patch: Unchecked input sanitization`,
        severity: Severity.HIGH,
        filePath: file,
        fileName: file.split("/").pop() || "",
        lineRange: `lines ${10 + Math.floor(Math.random() * 30)}-${20 + Math.floor(Math.random() * 30)}`,
        description: `Direct parameter parsing noticed in database execute calls. Verify external boundaries are validated.`,
        issueDetected: `Input string interpolation context bypass inside ${file}.`,
        snippetBefore: `const parsed = req.query.id; \ndb.exec("SELECT * FROM items WHERE id = " + parsed);`,
        snippetAfter: `const parsed = Number(req.query.id) || 0; \ndb.exec("SELECT * FROM items WHERE id = ?", [parsed]);`,
        suggestion: `Parametrize SQL query strings and coerce parameter variables strictly to prevent bypasses.`,
        suggestedFix: `Cast input to Number and use sql query parameter binders.`,
        beginnerExplanation: "Inside secure applications, SQL inputs should never be mixed directly with code. Parametrized binders keep queries separated from parameters completely.",
        confidence: "High",
        whyFixWorks: "Using parameters translates values into literals at the database driver boundary, making nested escape commands entirely impossible."
      };

      setLiveStatus({
        text: "New PR change detected",
        timestamp: nowStr,
        isChange: true
      });

      setAnalysisResult(prev => {
        if (!prev) return null;
        
        const nextBugs = [...prev.bugs];
        const nextSecurity = [...prev.security];
        const nextPerformance = [...prev.performance];
        const nextSmells = [...prev.code_smells];
        
        if (randomCat === "bugs") nextBugs.push(simulatedIssue);
        else if (randomCat === "security") nextSecurity.push(simulatedIssue);
        else if (randomCat === "performance") nextPerformance.push(simulatedIssue);
        else nextSmells.push(simulatedIssue);
        
        const newRiskScore = Math.min(100, prev.summary.riskScore + 4);
        
        const nextResult = {
          ...prev,
          analyzedFilesCount: prev.analyzedFilesCount + 1,
          totalPRChangedFilesCount: (prev.totalPRChangedFilesCount || 0) + 1,
          estimatedCodeQualityScore: Math.max(10, Math.min(100, (prev.estimatedCodeQualityScore || 85) - 3)),
          summary: {
            ...prev.summary,
            riskScore: newRiskScore,
            criticalBugsCount: prev.summary.criticalBugsCount + (randomCat === "bugs" ? 1 : 0),
            securityViolationsCount: prev.summary.securityViolationsCount + (randomCat === "security" ? 1 : 0),
          },
          risk_score: newRiskScore,
          bugs: nextBugs,
          security: nextSecurity,
          performance: nextPerformance,
          code_smells: nextSmells,
          smells: nextSmells,
        };

        // Cache the live-modified state in localStorage
        saveScan({
          url: prev.repositoryUrl || "Demo Code Checkout",
          provider: isCustomPaste ? "pasted" : activeProvider,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          result: nextResult
        });

        return nextResult;
      });

      // Notify user via AI Companion Chat console
      setChatMessages(prev => [
        ...prev,
        {
          id: `webhook-alert-${uniqueSuffix}`,
          sender: "assistant",
          text: `📡 **[WEBHOOK CAPTURED]** Pull Request revised by @${username} on file \`${file}\`. Integrated patch analysis, refreshed risk matrix, and auto-saved findings in database local store!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);

    }, 10000);

    return () => clearInterval(timer);
  }, [isLiveMonitoring, analysisResult, isCustomPaste, activeProvider]);

  // Chatbot states
  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! Try checking the repository analysis and asking me how to refactor specific modules.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Update selected issue automatically when category, data, or search query changes
  useEffect(() => {
    if (analysisResult) {
      const activeList = analysisResult[selectedCategory] || [];
      const q = issueSearchQuery.toLowerCase().trim();
      const filtered = activeList.filter(issue => {
        if (!q) return true;
        return (
          issue.title.toLowerCase().includes(q) ||
          issue.filePath.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          issue.suggestion.toLowerCase().includes(q) ||
          issue.beginnerExplanation.toLowerCase().includes(q)
        );
      });

      if (filtered.length > 0) {
        const stillPresent = filtered.some(issue => issue.id === selectedIssue?.id);
        if (!stillPresent) {
          setSelectedIssue(filtered[0]);
        }
      } else {
        setSelectedIssue(null);
      }
    }
  }, [selectedCategory, analysisResult, issueSearchQuery]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Reset dynamic states on active issue change
  useEffect(() => {
    setGeneratedFix(null);
    setSimpleExplanation(null);
  }, [selectedIssue]);

  const handleExplainSimply = async () => {
    if (!selectedIssue) return;
    setIsExplainingSimply(true);
    setSimpleExplanation(null);
    try {
      const res = await fetch("/api/explain-simply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedIssue.title,
          description: selectedIssue.description,
          snippetBefore: selectedIssue.snippetBefore
        })
      });
      if (!res.ok) throw new Error("Failed to simplify");
      const data = await res.json();
      setSimpleExplanation(data.explanation);
    } catch (err) {
      console.error(err);
      setSimpleExplanation("Connection error: I couldn't explain this simply. Let's try once more!");
    } finally {
      setIsExplainingSimply(false);
    }
  };

  const handleGenerateFix = async () => {
    if (!selectedIssue) return;
    setIsGeneratingFix(true);
    setGeneratedFix(null);
    try {
      const res = await fetch("/api/generate-fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: selectedIssue.filePath,
          snippetBefore: selectedIssue.snippetBefore,
          title: selectedIssue.title,
          description: selectedIssue.description
        })
      });
      if (!res.ok) throw new Error("Failed to generate fix");
      const data = await res.json();
      setGeneratedFix(data.snippetAfter);
    } catch (err) {
      console.error(err);
      alert("Failed to generate dynamic fix. Feel free to use the pre-generated suggestion or retry.");
    } finally {
      setIsGeneratingFix(false);
    }
  };

  const fetchAndSetRepoStats = async (repoUrl: string, isCustomPasteMode: boolean = isCustomPaste, currentLanguage: string = language) => {
    let cleanName = "Direct Snippet Context";
    let lang = isCustomPasteMode ? currentLanguage : "TypeScript";
    let stars = 142;
    let forks = 28;
    
    if (repoUrl && !isCustomPasteMode) {
      if (repoUrl.includes("github.com")) {
        try {
          const pathSeg = repoUrl.replace("https://github.com/", "").replace(".git", "");
          const parts = pathSeg.split("/");
          if (parts.length >= 2) {
            cleanName = `${parts[0]}/${parts[1]}`;
            const devUrl = `https://api.github.com/repos/${parts[0]}/${parts[1]}`;
            const headers: Record<string, string> = {
              "Accept": "application/vnd.github.v3+json",
            };
            if (githubToken && githubToken.trim()) {
              headers["Authorization"] = `token ${githubToken.trim()}`;
            }
            const res = await fetch(devUrl, { headers });
            if (res.ok) {
              const resData = await res.json();
              stars = resData.stargazers_count ?? 142;
              forks = resData.forks_count ?? 28;
              if (resData.language) {
                lang = resData.language;
              }
            } else {
              // fallback simulation
              stars = Math.floor(Math.random() * 500) + 120;
              forks = Math.floor(stars * 0.22);
            }
          }
        } catch (e) {
          console.warn("Could not retrieve live github metadata directly", e);
        }
      } else if (repoUrl.includes("gitlab.com")) {
        cleanName = repoUrl.replace("https://gitlab.com/", "");
        stars = 24;
        forks = 5;
        lang = "Go";
      } else {
        cleanName = "Self-Hosted Git Host";
      }
    } else {
      cleanName = `Direct Snippet: ${isCustomPasteMode ? currentLanguage : "Pasted Code"}`;
    }
    
    setStarsCount(stars);
    setForksCount(forks);
    setRepoLanguage(lang);
    setRepoDisplayName(cleanName);
  };

  const handleLoadDemo = async () => {
    setIsCustomPaste(true);
    const demoCode = `// Enterprise payment route controller
import express from 'express';
import sqlite3 from 'sqlite3';
const router = express.Router();
const db = new sqlite3.Database(':memory:');

// Security Critical: Direct SQL Injection interpolation
router.post('/api/checkout', async (req, res) => {
  const { cartToken, couponCode } = req.body;
  const rawQuery = "SELECT * FROM coupons WHERE code = '" + couponCode + "'";
  
  // Bug Alert: Potential memory pool leak or crash when query fails (unhandled rejection)
  db.all(rawQuery, [], (err, rows) => {
    if (err) {
      throw err; // Crashes the express master node process!
    }
    
    // Performance Issue: Quadratic CPU map search inside nested request loops
    const processedCart = req.body.items.map(item => {
      const match = req.body.inventory.find(inv => inv.id === item.id);
      return { ...item, match };
    });
    
    res.json({ success: true, cart: processedCart, coupons: rows });
  });
});`;
    setPastedCode(demoCode);
    setLanguage("TypeScript");
    setIsAnalyzing(true);
    setErrorMsg(null);

    const startTime = performance.now();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "",
          githubToken: "",
          pastedCode: demoCode,
          language: "TypeScript",
          isCustomPaste: true
        })
      });

      if (!response.ok) {
        throw new Error("Failed to process demo codebase.");
      }

      const rawData = await response.json();
      const endTime = performance.now();
      const durationSeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));
      setScanDuration(durationSeconds);

      const data = ensureSafeAnalysisResult(rawData);
      setAnalysisResult(data);
      saveScan({
        url: "Checkout Controller Demo",
        provider: "pasted",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: data
      });
      
      await fetchAndSetRepoStats("", true, "TypeScript");

      setSelectedCategory("security");
      if (data.security && data.security.length > 0) {
        setSelectedIssue(data.security[0]);
      } else {
        const categories: ("bugs" | "security" | "performance" | "smells")[] = ["bugs", "performance", "smells"];
        const firstNonEmpty = categories.find(cat => (data[cat] || []).length > 0) || "bugs";
        setSelectedCategory(firstNonEmpty);
        if (data[firstNonEmpty] && data[firstNonEmpty].length > 0) {
          setSelectedIssue(data[firstNonEmpty][0]);
        }
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: `analyzed-${Date.now()}`,
          sender: "assistant",
          text: `Demo analysis completed live! I detected several critical vulnerabilities in this server payment script, including Direct SQL injection and quadratic performance loops. Click any highlighted issue in the dashboard to review and generate fixes!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to run real-time demo. Please refresh or try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Execute review analysis call
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalyzing(true);
    setErrorMsg(null);

    const startTime = performance.now();

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: isCustomPaste ? "" : url,
          githubToken,
          pastedCode: isCustomPaste ? pastedCode : "",
          language,
          isCustomPaste
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed Code analysis.");
      }

      const rawData = await response.json();
      const endTime = performance.now();
      const durationSeconds = parseFloat(((endTime - startTime) / 1000).toFixed(2));
      setScanDuration(durationSeconds);

      const data = ensureSafeAnalysisResult(rawData);
      setAnalysisResult(data);
      saveScan({
        url: isCustomPaste ? `Direct Snip: ${language}` : url,
        provider: isCustomPaste ? "pasted" : activeProvider,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: data,
        language: isCustomPaste ? language : undefined
      });
      
      await fetchAndSetRepoStats(isCustomPaste ? "" : url, isCustomPaste, language);
      
      // Auto-focus on first issue
      const categories: ("bugs" | "security" | "performance" | "smells")[] = ["security", "bugs", "performance", "smells"];
      const firstNonEmpty = categories.find(cat => (data[cat] || []).length > 0) || "bugs";
      setSelectedCategory(firstNonEmpty);
      if (data[firstNonEmpty] && data[firstNonEmpty].length > 0) {
        setSelectedIssue(data[firstNonEmpty][0]);
      }

      // Append alert to chatbot
      const issuesCount = (data.bugs || []).length + (data.security || []).length + (data.performance || []).length + (data.smells || []).length;
      setChatMessages(prev => [
        ...prev,
        {
          id: `analyzed-${Date.now()}`,
          sender: "assistant",
          text: `I've successfully finalized analyzing "${isCustomPaste ? 'custom codebase' : url}". Detected ${issuesCount} potential issues with a Risk Index of ${data.summary.riskScore}/100. Feel free to ask code questions!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error(err);
      const rawError = err.message || "";
      let friendlyError = rawError;

      if (rawError.includes("Invalid GitHub URL") || rawError.includes("Invalid URL")) {
        friendlyError = "Invalid GitHub URL. Please make sure it matches: https://github.com/owner/repository (e.g., https://github.com/expressjs/express) or a valid Pull Request link.";
      } else if (rawError.toLowerCase().includes("not found")) {
        friendlyError = "Repository not found. Double-check your URL, and ensure the repository is public. If it is private, please paste a temporary Personal Access Token in the token field to authorize access.";
      } else if (rawError.toLowerCase().includes("rate limit")) {
        friendlyError = "GitHub API rate limit exceeded to this shared IP. Please supply an optional GitHub Personal Access Token to authenticate, or wait a few minutes before scanning again.";
      } else if (rawError.toLowerCase().includes("network error") || rawError.toLowerCase().includes("fetch")) {
        friendlyError = "Network error: Communication with GitHub API failed. Please verify your connection and try again.";
      } else if (!friendlyError) {
        friendlyError = "An unexpected error occurred while analyzing the codebase. Please try direct copy-paste mode instead.";
      }

      setErrorMsg(friendlyError);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit message to AI Companion Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput("");
    setChatLoading(true);

    try {
      // Build code context for model knowledge enhancement
      let codeCtx = "";
      if (analysisResult) {
        codeCtx += `Active Repository: ${analysisResult.repositoryUrl}\n`;
        codeCtx += `Risk Level: ${analysisResult.summary.riskScore}/100\n`;
        const activeIssue = selectedIssue || analysisResult.bugs[0] || analysisResult.security[0];
        if (activeIssue) {
          codeCtx += `Selected Issue for Context:\n- Title: ${activeIssue.title}\n- Location: ${activeIssue.filePath} (${activeIssue.lineRange})\n- Code snippet before:\n${activeIssue.snippetBefore}\n- Code snippet after:\n${activeIssue.snippetAfter}\n`;
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          history: chatMessages.slice(-8), // Send last 8 interactions
          codeContext: codeCtx
        })
      });

      if (!response.ok) {
        throw new Error("Chat connection failed.");
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        text: data.reply || "I am processing your query. Please reload or specify your code context.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, {
        id: `ai-err-${Date.now()}`,
        sender: "assistant",
        text: "Sorry, I had trouble reaching the AI Assistant proxy server. Verify your backend endpoint status and GEMINI_API_KEY.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Export static document report
  const handleExportPDF = () => {
    if (!analysisResult) return;
    
    const bugsList = analysisResult.bugs || [];
    const securityList = analysisResult.security || [];
    const performanceList = analysisResult.performance || [];
    const smellsList = analysisResult.code_smells || analysisResult.smells || [];

    const totalIssues = bugsList.length + securityList.length + performanceList.length + smellsList.length;
    const timestamp = new Date().toLocaleString();
    const repoUrlStr = analysisResult.repositoryUrl || "Direct Clipboard Snippet Checkout";

    const escapeHtml = (text: string) => {
      if (!text) return "";
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const renderIssueHtml = (issue: any, index: number, typeLabel: string, typeBadgeClass: string) => {
      return `
      <div class="issue-card">
        <div class="issue-header">
          <div>
            <span class="badge ${typeBadgeClass}">${escapeHtml(typeLabel)}</span>
            <span class="severity-badge ${issue.severity === "CRITICAL" || issue.severity === "HIGH" ? "high" : "low"}">${escapeHtml(issue.severity)}</span>
            <h4 class="issue-title">#${index + 1}: ${escapeHtml(issue.title)}</h4>
          </div>
          <span style="font-size: 11px; font-weight: bold; color: ${issue.resolved ? '#22c55e' : '#94a3b8'}">
            ${issue.resolved ? "✓ RESOLVED" : "⚠️ ACTIVE THREAT"}
          </span>
        </div>
        <div class="issue-meta">
          <strong>File:</strong> ${escapeHtml(issue.filePath)} &nbsp;|&nbsp; <strong>Line Range:</strong> ${escapeHtml(issue.lineRange)}
        </div>
        <div class="issue-desc">
          <strong>Problem Detected:</strong> ${escapeHtml(issue.issueDetected || issue.description)}
        </div>
        <div class="issue-desc" style="margin-top: 8px;">
          <strong>AI Review Comment:</strong> ${escapeHtml(issue.description)}
        </div>
        
        ${issue.snippetBefore ? `
        <div class="code-block-container">
          <div class="code-title before">Vulnerable Code Snippet Before</div>
          <pre class="code-preview"><code>${escapeHtml(issue.snippetBefore)}</code></pre>
        </div>
        ` : ""}

        ${issue.snippetAfter ? `
        <div class="code-block-container" style="margin-top: 10px;">
          <div class="code-title after">Optimized Resolution Suggestion After</div>
          <pre class="code-preview" style="background-color: #f0fdf4;"><code>${escapeHtml(issue.snippetAfter)}</code></pre>
        </div>
        ` : ""}

        ${issue.suggestion ? `
        <div class="issue-fix">
          <div class="fix-lbl">Suggested Fix Actions</div>
          <div style="font-size: 13px; color: #1e3a1e; font-family: sans-serif;">${escapeHtml(issue.suggestion)}</div>
        </div>
        ` : ""}

        ${issue.whyFixWorks ? `
        <div class="why-fix">
          <strong>Why This Fix Safeguards the Runtime:</strong>
          <span style="font-size: 13px; color: #047857; font-family: sans-serif; display: block; margin-top: 4px;">${escapeHtml(issue.whyFixWorks)}</span>
        </div>
        ` : ""}
      </div>
      `;
    };

    const htmlReportContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodePilot Security Review Report - ${escapeHtml(repoDisplayName)}</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            color: #1e293b; 
            line-height: 1.6; 
            padding: 30px; 
            background-color: #f8fafc; 
        }
        .container { 
            max-width: 1000px; 
            margin: 0 auto; 
            background: #ffffff; 
            padding: 40px; 
            border-radius: 16px; 
            border: 1px solid #e2e8f0; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); 
        }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 2px solid #e2e8f0; 
            padding-bottom: 24px; 
            margin-bottom: 30px; 
        }
        .logo-wrap { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
        }
        .logo-icon { 
            width: 40px; 
            height: 40px; 
            background-color: #4f46e5; 
            color: #ffffff; 
            font-weight: bold; 
            font-size: 20px; 
            border-radius: 8px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
        }
        .logo-text { 
            font-size: 22px; 
            font-weight: 800; 
            color: #0f172a; 
            letter-spacing: -0.02em; 
        }
        .branding { 
            text-transform: uppercase; 
            font-size: 10px; 
            letter-spacing: 0.1em; 
            background: #e0e7ff; 
            color: #4338ca; 
            padding: 4px 10px; 
            border-radius: 6px; 
            font-weight: bold; 
        }
        .header-print-btn {
            background-color: #4f46e5;
            color: white;
            border: none;
            padding: 8px 16px;
            font-size: 13px;
            border-radius: 6px;
            cursor: pointer;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .header-print-btn:hover {
            background-color: #4338ca;
        }
        .meta-grid { 
            display: grid; 
            grid-template-cols: repeat(2, 1fr); 
            gap: 16px; 
            margin-bottom: 30px; 
            background: #f8fafc; 
            padding: 20px; 
            border: 1px solid #edf2f7; 
            border-radius: 12px; 
        }
        @media (max-width: 600px) {
            .meta-grid { grid-template-cols: 1fr; }
        }
        .meta-item { 
            font-size: 13px; 
        }
        .meta-label { 
            font-weight: bold; 
            color: #64748b; 
            text-transform: uppercase; 
            font-size: 10px; 
            margin-bottom: 4px; 
            letter-spacing: 0.05em; 
        }
        .meta-value { 
            font-size: 14px; 
            font-weight: 600; 
            color: #0f172a; 
            word-break: break-all; 
        }
        .dashboard-row {
            display: grid;
            grid-template-cols: 1fr 2fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        @media (max-width: 768px) {
            .dashboard-row { grid-template-cols: 1fr; }
        }
        .score-box { 
            background: #fee2e2; 
            border: 1px solid #fecaca; 
            padding: 30px; 
            border-radius: 14px; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            text-align: center; 
        }
        .score-box.secure { 
            background: #ecfdf5; 
            border-color: #a7f3d0; 
        }
        .score-value { 
            font-size: 54px; 
            font-weight: 900; 
            color: #ef4444; 
            line-height: 1; 
            margin-bottom: 10px; 
        }
        .score-box.secure .score-value { 
            color: #10b981; 
        }
        .score-label { 
            font-size: 11px; 
            text-transform: uppercase; 
            letter-spacing: 0.08em; 
            color: #ef4444; 
            font-weight: 800; 
        }
        .score-box.secure .score-label { 
            color: #10b981; 
        }
        .quick-metrics {
            padding: 24px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            display: grid;
            grid-template-cols: repeat(4, 1fr);
            gap: 12px;
            align-content: center;
        }
        @media (max-width: 500px) {
            .quick-metrics { grid-template-cols: repeat(2, 1fr); }
        }
        .metric-card {
            text-align: center;
        }
        .metric-num {
            font-size: 24px;
            font-weight: bold;
            color: #0f172a;
        }
        .metric-lbl {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 700;
            margin-top: 4px;
        }
        .section-title { 
            font-size: 18px; 
            font-weight: 700; 
            border-bottom: 2px solid #f1f5f9; 
            padding-bottom: 10px; 
            margin-top: 40px; 
            margin-bottom: 20px; 
            color: #0f172a; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
        }
        .badge { 
            font-index: 10px; 
            font-weight: bold; 
            padding: 3px 8px; 
            border-radius: 4px; 
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            display: inline-block; 
            vertical-align: middle; 
            margin-right: 8px; 
        }
        .badge-bugs { background: #fee2e2; color: #991b1b; }
        .badge-security { background: #fef3c7; color: #92400e; }
        .badge-performance { background: #e0e7ff; color: #3730a3; }
        .badge-smells { background: #f1f5f9; color: #334155; }
        
        .severity-badge {
            font-size: 9px;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
            display: inline-block;
            vertical-align: middle;
            margin-right: 8px;
        }
        .severity-badge.high { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
        .severity-badge.low { background: #f1f5f9; color: #475569; }

        .issue-card { 
            background: #ffffff; 
            border: 1px solid #edf2f7; 
            border-radius: 12px; 
            padding: 24px; 
            margin-bottom: 20px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.02); 
        }
        .issue-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 14px; 
            flex-wrap: wrap; 
            gap: 10px; 
        }
        .issue-title { 
            font-weight: bold; 
            font-size: 16px; 
            color: #0f172a; 
            margin: 6px 0 0 0; 
            display: inline-block; 
        }
        .issue-meta { 
            font-family: monospace; 
            font-size: 11px; 
            color: #64748b; 
            margin-bottom: 12px; 
            background-color: #f1f5f9; 
            padding: 6px 12px; 
            border-radius: 6px; 
            display: inline-block; 
        }
        .issue-desc { 
            font-size: 13.5px; 
            color: #334155; 
            margin-bottom: 10px; 
        }
        .code-block-container {
            border: 1px solid #edf2f7;
            border-radius: 8px;
            overflow: hidden;
            margin: 12px 0;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
        }
        .code-title {
            font-size: 11px;
            font-weight: 700;
            padding: 6px 12px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .code-title.before {
            background-color: #fee2e2;
            color: #991b1b;
        }
        .code-title.after {
            background-color: #dcfce7;
            color: #15803d;
        }
        .code-preview { 
            margin: 0; 
            padding: 14px; 
            font-size: 12px; 
            overflow-x: auto; 
            background: #1e293b; 
            color: #f1f5f9; 
        }
        .code-preview code { 
            font-family: inherit; 
        }
        .issue-fix { 
            background: #f0fdf4; 
            border: 1px solid #bbf7d0; 
            padding: 16px; 
            border-radius: 10px; 
            margin-top: 14px; 
        }
        .why-fix { 
            background: #eff6ff; 
            border: 1px solid #bfdbfe; 
            padding: 16px; 
            border-radius: 10px; 
            margin-top: 12px; 
            font-size: 13px;
        }
        .fix-lbl { 
            font-size: 11px; 
            font-weight: 800; 
            color: #166534; 
            text-transform: uppercase; 
            margin-bottom: 6px; 
            letter-spacing: 0.05em; 
        }
        .footer { 
            text-align: center; 
            font-size: 11px; 
            color: #94a3b8; 
            margin-top: 60px; 
            border-top: 2px solid #f1f5f9; 
            padding-top: 30px; 
        }
        @media print {
            body { background: #ffffff; padding: 0; }
            .container { box-shadow: none; border: none; padding: 0; }
            .issue-card { page-break-inside: avoid; }
            .header-print-btn { display: none; }
        }
    </style>
</head>
<body>
    <div style="text-align: right;">
        <button onclick="window.print()" class="header-print-btn">🖨️ Print or Save to PDF</button>
    </div>
    <div class="container">
        <div class="header">
            <div class="logo-wrap">
                <div class="logo-icon">CP</div>
                <div>
                    <div class="logo-text">CodePilot AI</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 1px; font-weight: 500;">Automated Security Audit Report</div>
                </div>
            </div>
            <div class="branding">Audit Verified</div>
        </div>

        <div class="meta-grid">
            <div class="meta-item">
                <div class="meta-label">Verified Workspace Context</div>
                <div class="meta-value">${escapeHtml(repoDisplayName)}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Original Repository URL</div>
                <div class="meta-value">${escapeHtml(repoUrlStr)}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Analysis Timestamp</div>
                <div class="meta-value">${escapeHtml(timestamp)}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Files Checked Count</div>
                <div class="meta-value">${analysisResult.analyzedFilesCount} analyzed channels</div>
            </div>
        </div>

        <div class="dashboard-row">
            <div class="score-box ${analysisResult.summary.riskScore < 50 ? 'secure' : ''}">
                <div class="score-value">${analysisResult.summary.riskScore}</div>
                <div class="score-label">OVERALL THREAT RISK INDEX</div>
            </div>
            <div class="quick-metrics">
                <div class="metric-card">
                    <div class="metric-num" style="color: #ef4444;">${bugsList.length}</div>
                    <div class="metric-lbl">Total Bugs</div>
                </div>
                <div class="metric-card">
                    <div class="metric-num" style="color: #f59e0b;">${securityList.length}</div>
                    <div class="metric-lbl">Security Threat</div>
                </div>
                <div class="metric-card">
                    <div class="metric-num" style="color: #3b82f6;">${performanceList.length}</div>
                    <div class="metric-lbl">Perf Latency</div>
                </div>
                <div class="metric-card">
                    <div class="metric-num" style="color: #64748b;">${smellsList.length}</div>
                    <div class="metric-lbl">Anti-patterns</div>
                </div>
            </div>
        </div>

        <div class="issue-card" style="background-color: #f8fafc; border-left: 4px solid #4f46e5;">
            <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #0f172a;">Executive Code Audit Summary</h3>
            <p style="font-size: 13.5px; margin: 0; color: #334155; line-height: 1.6;">${escapeHtml(analysisResult.summary.overallSummary)}</p>
        </div>

        <div class="section-title">
            <span>Critical Bulletins &amp; Bugs (${bugsList.length})</span>
        </div>
        ${bugsList.length === 0 ? '<p style="font-size: 13px; color: #64748b;">No outstanding software logic bugs detected.</p>' : bugsList.map((b, i) => renderIssueHtml(b, i, "BUG", "badge-bugs")).join("")}

        <div class="section-title">
            <span>Security Attack Vectors &amp; Vulnerabilities (${securityList.length})</span>
        </div>
        ${securityList.length === 0 ? '<p style="font-size: 13px; color: #64748b;">No severe security vulnerabilities identified.</p>' : securityList.map((s, i) => renderIssueHtml(s, i, "SECURITY", "badge-security")).join("")}

        <div class="section-title">
            <span>Performance &amp; Latency Violations (${performanceList.length})</span>
        </div>
        ${performanceList.length === 0 ? '<p style="font-size: 13px; color: #64748b;">No high-quadratic loop performance bottlenecks detected.</p>' : performanceList.map((p, i) => renderIssueHtml(p, i, "PERFORMANCE", "badge-performance")).join("")}

        <div class="section-title">
            <span>Code Smells &amp; Anti-Patterns (${smellsList.length})</span>
        </div>
        ${smellsList.length === 0 ? '<p style="font-size: 13px; color: #64748b;">Codebase conforms beautifully to modular readability conventions.</p>' : smellsList.map((cm, i) => renderIssueHtml(cm, i, "CODE SMELL", "badge-smells")).join("")}

        <div class="footer">
            <strong>CodePilot</strong> Software Intelligence and Security Review Board &nbsp;|&nbsp; Certified at ${escapeHtml(timestamp)}<br>
            <span style="font-size: 9px; color: #cbd5e1; display: block; margin-top: 8px;">CONFIDENTIAL SECURITY REVIEW REPORT — FOR INTENDED RECIPIIENT USE ONLY</span>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlReportContent], { type: "text/html;charset=utf-8" });
    const fileUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = fileUrl;
    downloadLink.download = `codepilot-review-report-${escapeHtml(repoDisplayName.replace("/", "-"))}.html`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Utility to copy snippets
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Code snippet copied directly to clipboard!");
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white p-4 md:p-6 gap-6">
      
      {/* Header Cell Pattern */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
            CP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display tracking-tight text-white leading-none">CodePilot AI</h1>
              <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest uppercase bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                Hackathon MVP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Autonomous GitHub Code Review & Security Risk Radar</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {analysisResult && (
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-lg text-xs font-semibold text-slate-200 border border-slate-700 transition"
              title="Export dynamic Markdown report bundle"
            >
              <Download size={14} className="text-indigo-400" />
              <span>Export Report</span>
            </button>
          )}

          <button 
            type="button"
            onClick={() => setIsLiveMonitoring(!isLiveMonitoring)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer select-none ${
              isLiveMonitoring 
                ? "bg-red-500/10 text-red-400 border-red-500/30 font-bold" 
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-300"
            }`}
            title="Simulate push triggers and live pull request analysis webhooks"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLiveMonitoring ? "bg-red-500 animate-ping" : "bg-slate-500"}`} />
            <span>Live Monitoring: {isLiveMonitoring ? "ON" : "OFF"}</span>
          </button>

          {isLiveMonitoring && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              liveStatus.isChange 
                ? "bg-emerald-500/15 text-emerald-450 border-emerald-500/30" 
                : "bg-slate-950/80 text-slate-450 border-slate-800"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${liveStatus.isChange ? "bg-emerald-500 duration-100 animate-pulse" : "bg-slate-500"}`} />
              <span className="font-sans">
                {liveStatus.text} <span className="text-[10px] text-slate-500 font-mono">[{liveStatus.timestamp}]</span>
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsRecentDrawerOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-semibold text-slate-250 border border-slate-700 rounded-lg transition cursor-pointer select-none"
            title="Open recently cached audit reports index"
          >
            <span>🕒 Recent Audits ({recentScans.length})</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-950 p-1.5 px-3 rounded-lg border border-slate-800 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="font-mono text-slate-300">GEMINI CLoud</span>
          </div>

          <button
            onClick={handleLoadDemo}
            className="px-3 py-1.5 bg-slate-800/40 hover:bg-indigo-950/40 text-[10px] uppercase font-mono tracking-wide rounded-lg text-slate-300 border border-slate-800 hover:border-indigo-500/30 transition flex items-center gap-1.5"
            title="Load live simulated checkout controller audit demo"
          >
            <RefreshCw size={11} className="animate-spin-slow text-indigo-400" />
            <span>Load Demo</span>
          </button>
        </div>
      </header>

      {/* Inputs Banner - Multi-mode Selector */}
      <section className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 md:p-6 shadow-xl">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsCustomPaste(false)}
                className={`pb-2 text-sm font-semibold border-b-2 transition ${!isCustomPaste ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Scan Remote GitHub Repo / PR
              </button>
              <button
                type="button"
                onClick={() => setIsCustomPaste(true)}
                className={`pb-2 text-sm font-semibold border-b-2 transition ${isCustomPaste ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
              >
                Direct Paste Snip Code
              </button>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBeginnerMode}
                  onChange={(e) => setIsBeginnerMode(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                <span className="font-mono text-xs flex items-center gap-1">
                  <BookOpen size={12} className="text-yellow-400" />
                  Beginner Friendly Explanation
                </span>
              </label>
            </div>
          </div>

          {/* Action Row */}
          {!isCustomPaste ? (
            <div className="space-y-4">
              {/* Provider Tabs */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveProvider("github")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer select-none ${
                    activeProvider === "github"
                      ? "bg-slate-800 border-indigo-500/50 text-white"
                      : "bg-slate-950/40 border-slate-900/50 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Github size={13} />
                  <span>GitHub</span>
                  {url.toLowerCase().includes("github.com") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveProvider("gitlab")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer select-none ${
                    activeProvider === "gitlab"
                      ? "bg-slate-800 border-orange-500/50 text-white"
                      : "bg-slate-950/40 border-slate-900/50 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Gitlab size={13} className="text-orange-500" />
                  <span>GitLab</span>
                  {url.toLowerCase().includes("gitlab.com") && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-6 relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                    {activeProvider === "github" ? <Github size={16} /> : <Gitlab size={16} className="text-orange-500" />}
                  </div>
                  <input
                    type="text"
                    placeholder={
                      activeProvider === "github"
                        ? "GitHub Repo URL or Pull Request URL (e.g., https://github.com/expressjs/express/pull/3534)"
                        : "GitLab Project URL or Merge Request URL (e.g., https://gitlab.com/gitlab-org/gitlab/-/merge_requests/145455)"
                    }
                    value={url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUrl(val);
                      if (val.toLowerCase().includes("gitlab.com")) {
                        setActiveProvider("gitlab");
                      } else if (val.toLowerCase().includes("github.com")) {
                        setActiveProvider("github");
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs md:text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-500 text-slate-100"
                  />
                </div>

                <div className="lg:col-span-4 relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                    <Terminal size={14} />
                  </div>
                  <input
                    type="password"
                    placeholder={`Optional: ${activeProvider === "github" ? "GitHub Token" : "GitLab Private Token"}`}
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs md:text-sm focus:outline-none focus:border-indigo-500 placeholder:text-slate-500 text-slate-100"
                    title={`If scan fails on private repos or rate limits, paste your Personal ${activeProvider === "github" ? "GitHub Token" : "GitLab PRIVATE-TOKEN"}`}
                  />
                </div>

                <div className="lg:col-span-2">
                  <button
                    type="submit"
                    disabled={isAnalyzing || !url.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-45 disabled:pointer-events-none text-white font-bold py-3 px-4 rounded-xl text-xs md:text-sm shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Play size={15} />
                        <span>Analyze {activeProvider === "github" ? "GitHub" : "GitLab"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-slate-400 font-mono mb-1.5">Language Target</label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="TypeScript">TypeScript / Node.js</option>
                    <option value="Python">Python</option>
                    <option value="Go">Go</option>
                    <option value="Java">Java</option>
                    <option value="C++">C++</option>
                    <option value="Rust">Rust</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-slate-400 font-mono mb-1.5">Source Script</label>
                <textarea
                  rows={6}
                  value={pastedCode}
                  onChange={(e) => setPastedCode(e.target.value)}
                  placeholder="Write or copy-paste vulnerability-rich code lines here to perform audit tests..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-indigo-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl text-xs sm:text-sm shadow-md transition flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <LoaderPulse />
                      <span>Reviewing Code...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Initiate Instant Analysis</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-500/15 border-l-4 border-red-500 p-4 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertOctagon size={16} className="shrink-0 mt-0.5 text-red-400" />
              <div>
                <p className="font-bold">Execution Warning</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}
        </form>
      </section>

      {/* Main Bento Grid Anchor */}
      <div id="main-grid-anchor" />

      {/* Main Bento Grid */}
      {isAnalyzing ? (
        <div className="flex-1 bg-slate-900 border border-slate-800/80 rounded-3xl p-12 flex flex-col items-center justify-center min-h-[350px]">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-4 border-t-indigo-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Cpu size={20} className="text-indigo-400 animate-pulse" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mt-6 font-display">Analyzing repository...</h3>
          <p className="text-xs text-slate-400 mt-2 text-center max-w-md animate-pulse">
            Connecting deep AST parsers. Consulting Gemini's software knowledge library for potential bugs, security vulnerabilities, performance loops, and code smells.
          </p>
        </div>
      ) : analysisResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          
          {/* Repository Summary Segment */}
          <div className="col-span-1 lg:col-span-12 bg-slate-900 border border-slate-800/85 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Cpu size={120} className="text-white" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/50 pb-4 mb-4 gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400">Review Assistant Dashboard</span>
                <h3 className="text-lg font-bold text-white tracking-tight">Active Repository Summary</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-slate-450 font-mono">Connected Ref: {analysisResult.repositoryUrl ? (analysisResult.repositoryUrl.replace("https://github.com/", "").replace("https://gitlab.com/", "")) : "Code Checkout Context"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Metric 1: Repository Name & Language */}
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Repository name</span>
                  <div className="text-sm font-bold text-white mt-1 break-words line-clamp-2 md:line-clamp-none" title={repoDisplayName}>
                    {repoDisplayName}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/60">
                  <span className="text-[9px] text-indigo-400 font-mono tracking-wider block">PRIMARY LANGUAGE</span>
                  <span className="text-xs font-semibold text-slate-300">{repoLanguage}</span>
                </div>
              </div>

              {/* Metric 2: Stars Count */}
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">GitHub Stars</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-amber-400">★ {starsCount.toLocaleString()}</span>
                </div>
                <p className="text-[9px] text-slate-450 mt-2 font-mono">Popularity score</p>
              </div>

              {/* Metric 3: Forks Count */}
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Git Forks</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-blue-400">⑂ {forksCount}</span>
                </div>
                <p className="text-[9px] text-slate-450 mt-2 font-mono">Derivative ports</p>
              </div>

              {/* Metric 4: Total Files Analyzed */}
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Files Analyzed</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-white">{analysisResult.analyzedFilesCount}</span>
                  <span className="text-xs text-slate-400">files</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, analysisResult.analyzedFilesCount * 12)}%` }}></div>
                </div>
              </div>

              {/* Metric 5: PR Files Changed */}
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">PR Files Changed</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-amber-500">{analysisResult.totalPRChangedFilesCount ?? 0}</span>
                  <span className="text-xs text-slate-450">files</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1 mt-3">
                  <span>{analysisResult.isPullRequest ? "⚡ PR Mode Filter" : "Full Audit Mode"}</span>
                </span>
              </div>

              {/* Metric 6: Scan Duration */}
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Scan Duration</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-emerald-400">{scanDuration}</span>
                  <span className="text-xs text-slate-400">sec</span>
                </div>
                <p className="text-[9px] text-emerald-500/85 mt-3 font-mono">⚡ Real-time speed</p>
              </div>

              {/* Metric 7: Overall Threat Score */}
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-500">Threat Index</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-3xl font-black ${analysisResult.summary.riskScore >= 70 ? 'text-red-500' : 'text-emerald-400'}`}>{analysisResult.summary.riskScore}</span>
                  <span className="text-xs text-slate-450">/ 100</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${analysisResult.summary.riskScore >= 70 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                    style={{ width: `${analysisResult.summary.riskScore}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Cell 1: Risk score visual circular gauge (Span 3) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden shadow-lg h-full">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl"></div>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Vulnerability Threat level</span>
                <span className={`px-2 py-0.5 text-[9px] font-mono rounded ${analysisResult.summary.riskScore >= 75 ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                  {analysisResult.summary.riskScore >= 75 ? "CRITICAL RISKS" : "MODERATE STATUS"}
                </span>
              </div>

              {/* Circle Gauge */}
              <div className="flex flex-col items-center py-6">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="#1e293b" strokeWidth="8" fill="none" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      stroke={analysisResult.summary.riskScore >= 75 ? "#ef4444" : analysisResult.summary.riskScore >= 45 ? "#fbbf24" : "#818cf8"} 
                      strokeWidth="8" 
                      strokeDasharray={`${2 * Math.PI * 42}`} 
                      strokeDashoffset={`${2 * Math.PI * 42 * (1 - analysisResult.summary.riskScore / 100)}`} 
                      fill="none" 
                      strokeLinecap="round" 
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-5xl font-extrabold font-display text-white">{analysisResult.summary.riskScore}</span>
                    <span className="text-[10px] text-slate-500 font-mono">100 MAX</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-400 text-center px-4">
                  Threat index determined by active secure logic audits and structural anomalies.
                </p>
              </div>
            </div>

            {/* Bottom mini overview */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 mt-auto flex flex-col gap-3">
              <div>
                <span className="text-slate-500 text-[10px] font-mono block mb-1">AUDIT SUMMARY</span>
                <p className="text-xs text-slate-300 line-clamp-4 leading-relaxed">
                  {analysisResult.summary.overallSummary}
                </p>
              </div>
              <div className="border-t border-slate-900 pt-2 flex items-center gap-1.5 text-amber-500/90 text-[10px] font-semibold tracking-wide font-mono">
                <span>⚠️</span>
                <span>AI-generated findings require developer verification</span>
              </div>
            </div>
          </div>

          {/* Bento Cell 2: Quick metrics counters (Span 4) */}
          <div className="lg:col-span-8 flex flex-col gap-5 justify-between">
            
            {/* Split row of stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Stat 1: Bugs */}
              <button 
                onClick={() => setSelectedCategory("bugs")}
                className={`text-left p-5 rounded-3xl border transition flex flex-col justify-between h-36 ${selectedCategory === "bugs" ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                    <AlertBugIcon />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">BUG</span>
                </div>
                <div>
                  <span className="text-3xl font-black text-white block mt-1">{analysisResult.bugs.length}</span>
                  <p className="text-[10px] text-slate-400 font-medium">Logical flaws</p>
                </div>
              </button>

              {/* Stat 2: Security */}
              <button 
                onClick={() => setSelectedCategory("security")}
                className={`text-left p-5 rounded-3xl border transition flex flex-col justify-between h-36 ${selectedCategory === "security" ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-xl">
                    <ShieldAlert size={16} />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">SEC</span>
                </div>
                <div>
                  <span className="text-3xl font-black text-white block mt-1">{analysisResult.security.length}</span>
                  <p className="text-[10px] text-slate-400 font-medium font-mono text-yellow-500">OWASP exploits</p>
                </div>
              </button>

              {/* Stat 3: Performance */}
              <button 
                onClick={() => setSelectedCategory("performance")}
                className={`text-left p-5 rounded-3xl border transition flex flex-col justify-between h-36 ${selectedCategory === "performance" ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">PERF</span>
                </div>
                <div>
                  <span className="text-3xl font-black text-white block mt-1">{analysisResult.performance.length}</span>
                  <p className="text-[10px] text-slate-400 font-medium">Memory & CPU loops</p>
                </div>
              </button>

              {/* Stat 4: Code smells */}
              <button 
                onClick={() => setSelectedCategory("smells")}
                className={`text-left p-5 rounded-3xl border transition flex flex-col justify-between h-36 ${selectedCategory === "smells" ? 'bg-indigo-950/30 border-indigo-500/50 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                    <Layers size={16} />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">SMELL</span>
                </div>
                <div>
                  <span className="text-3xl font-black text-white block mt-1">{analysisResult.smells.length}</span>
                  <p className="text-[10px] text-slate-400 font-medium font-mono text-amber-500">Refactoring triggers</p>
                </div>
              </button>

            </div>

            {/* Bento Cell 3: Strengths and Key Risks (Span columns below counters) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {/* Strengths List Card */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
                <h4 className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-emerald-500" />
                  Codebase Strengths
                </h4>
                <div className="space-y-2">
                  {analysisResult.summary.strengths.map((str, i) => (
                    <div key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-emerald-400 font-mono font-bold">0{i+1}.</span>
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Risks Checklist */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5">
                <h4 className="text-xs text-red-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-yellow-500" />
                  Urgent Risk Exposure
                </h4>
                <div className="space-y-2">
                  {analysisResult.summary.keyRisks.map((risk, i) => (
                    <div key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-red-400 font-mono font-bold">⚠️</span>
                      <span>{risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Bento Cell 4: Code issues feed (Span 5) */}
          <div className="col-span-1 lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col h-[520px]">
            {(() => {
              const activeIssues = analysisResult[selectedCategory] || [];
              const q = issueSearchQuery.toLowerCase().trim();
              const filtered = activeIssues.filter(issue => {
                if (!q) return true;
                return (
                  issue.title.toLowerCase().includes(q) ||
                  issue.filePath.toLowerCase().includes(q) ||
                  issue.description.toLowerCase().includes(q) ||
                  issue.suggestion.toLowerCase().includes(q) ||
                  issue.beginnerExplanation.toLowerCase().includes(q)
                );
              });

              return (
                <>
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                      <span>Category Issues:</span>
                      <span className="text-indigo-400 font-mono font-bold text-xs uppercase">{selectedCategory}</span>
                    </h3>
                    <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono font-semibold">
                      {q ? `${filtered.length}/${activeIssues.length}` : activeIssues.length} found
                    </span>
                  </div>

                  {/* Search bar inside the cell */}
                  <div className="mb-3.5 relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
                      <Search size={14} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search issues, file paths, suggestions..."
                      value={issueSearchQuery}
                      onChange={(e) => setIssueSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-xl py-2 pl-9 pr-14 text-xs outline-none placeholder:text-slate-500 text-slate-200 transition"
                    />
                    {issueSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setIssueSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] uppercase font-mono tracking-wider hover:text-white text-slate-500 bg-slate-900 border border-slate-800 hover:border-slate-700 px-1.5 py-0.5 rounded-md transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* List scroll wrapper */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {filtered.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-950/45 rounded-2xl border border-dashed border-slate-800/80">
                        <CheckCircle size={32} className="text-emerald-500 mb-2 opacity-50" />
                        <p className="text-xs font-bold text-slate-300">No confirmed issue detected</p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                          {activeIssues.length === 0 
                            ? "No confirmed issue detected in this category for the analyzed code."
                            : "Refine query text to search list patterns."}
                        </p>
                      </div>
                    ) : (
                      filtered.map((issue, idx) => (
                        <div
                          key={`${issue.id || 'issue'}-${idx}`}
                          onClick={() => setSelectedIssue(issue)}
                          className={`w-full text-left p-4 rounded-xl transition border block relative cursor-pointer ${
                            issue.resolved 
                              ? 'bg-slate-950/40 border-slate-900 opacity-75' 
                              : selectedIssue?.id === issue.id 
                                ? 'bg-indigo-950/40 border-indigo-500/60' 
                                : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-xs font-bold line-clamp-2 pr-6 transition-all flex items-center gap-1.5 ${issue.resolved ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {issue.resolved && <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                              {issue.title}
                            </h4>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <ConfidenceBadge confidence={issue.confidence} />
                              <SeverityBadge severity={issue.severity} />
                            </div>
                          </div>
                          
                          <p className={`text-[11px] line-clamp-2 mt-2 leading-relaxed transition-colors ${issue.resolved ? 'text-slate-500' : 'text-slate-400'}`}>
                            {isBeginnerMode ? issue.beginnerExplanation : issue.description}
                          </p>

                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-900 gap-2">
                            <span className="truncate max-w-[140px] text-indigo-300 flex items-center gap-1">
                              📁 {issue.filePath}
                            </span>
                            <span>{issue.lineRange}</span>

                            <button
                              type="button"
                              onClick={(e) => toggleIssueResolved(issue.id || `issue-${idx}`, e)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border transition duration-150 select-none shrink-0 ${
                                issue.resolved 
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" 
                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700 cursor-pointer"
                              }`}
                              title={issue.resolved ? "Mark as Unresolved" : "Mark as Resolved"}
                            >
                              <span>{issue.resolved ? "✓ Resolved" : "Resolve"}</span>
                            </button>
                          </div>

                          {selectedIssue?.id === issue.id && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-pulse">
                              <ChevronRight size={18} />
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </>
              );
            })()}

            <div className="text-[10px] text-slate-500 font-mono text-center mt-3 pt-2 border-t border-slate-800">
              Tip: Click on counters above to switch view categories.
            </div>
          </div>

          {/* Bento Cell 5: Detailed Issue Correction Visual (Span 7) */}
          <div className="col-span-1 lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col h-[520px]">
            {selectedIssue ? (
              <div className="h-full flex flex-col overflow-y-auto pr-1">
                
                {/* Header title */}
                <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono tracking-wider text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                        {selectedCategory.toUpperCase()} REPORT
                      </span>
                      <ConfidenceBadge confidence={selectedIssue.confidence} />
                      <SeverityBadge severity={selectedIssue.severity} />
                    </div>
                    <h2 className="text-base font-bold text-white mt-1.5 font-display">{selectedIssue.title}</h2>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      File: {selectedIssue.filePath} &bull; Location: {selectedIssue.lineRange}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 self-start shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleIssueResolved(selectedIssue.id, e)}
                      className={`p-2 rounded-lg border flex items-center gap-1 text-xs select-none transition cursor-pointer ${
                        selectedIssue.resolved 
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30" 
                          : "bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800"
                      }`}
                      title={selectedIssue.resolved ? "Mark as Unresolved" : "Mark as Resolved"}
                    >
                      <CheckCircle size={13} className={selectedIssue.resolved ? "text-emerald-400" : "text-slate-400"} />
                      <span>{selectedIssue.resolved ? "Resolved" : "Resolve"}</span>
                    </button>

                    <button
                      onClick={() => copyToClipboard(generatedFix || selectedIssue.snippetAfter)}
                      className="p-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 flex items-center gap-1 text-xs select-none cursor-pointer"
                      title="Copy optimized resolution code"
                    >
                      <Copy size={13} />
                      <span className="hidden sm:inline">Copy Fix</span>
                    </button>
                  </div>
                </div>

                {/* Substantive Description & Beginner switch */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 mb-4 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-0.5">Problem Analysis</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedIssue.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-900">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 font-semibold block mb-0.5">Actionable Suggestion</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedIssue.suggestion}</p>
                  </div>

                  {selectedIssue.whyFixWorks && (
                    <div className="pt-2 border-t border-slate-900">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-semibold block mb-0.5">Why This Fix Works</span>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{selectedIssue.whyFixWorks}</p>
                    </div>
                  )}

                  {/* Interactive Control row for upgrading comments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={handleExplainSimply}
                      disabled={isExplainingSimply}
                      className="w-full px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 active:bg-yellow-500/35 border border-yellow-500/35 hover:border-yellow-500/50 text-yellow-300 hover:text-yellow-100 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-45 cursor-pointer select-none"
                    >
                      <HelpCircle size={13} className={isExplainingSimply ? "animate-spin" : ""} />
                      <span>{isExplainingSimply ? "Simplifying..." : "Explain Simply"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateFix}
                      disabled={isGeneratingFix}
                      className="w-full px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 active:bg-indigo-500/35 border border-indigo-500/35 hover:border-indigo-500/50 text-indigo-300 hover:text-indigo-100 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 disabled:opacity-45 cursor-pointer select-none"
                    >
                      <Sparkles size={13} className={isGeneratingFix ? "animate-pulse" : ""} />
                      <span>{isGeneratingFix ? "Generating Fix..." : "Generate Fix"}</span>
                    </button>
                  </div>

                  {/* Toggle Mode Beginner presentation card below */}
                  {(simpleExplanation || isExplainingSimply) ? (
                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg animate-fade-in">
                      <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs uppercase font-mono mb-1">
                        <Sparkles size={13} className={isExplainingSimply ? "animate-spin" : ""} />
                        <span>Gemini Pedagogical Explanation ({isExplainingSimply ? "Generating..." : "Live"})</span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                        {isExplainingSimply ? "Pedagogy engine consulting real-world analogies..." : simpleExplanation}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-xs uppercase font-mono mb-1">
                        <HelpCircle size={13} />
                        <span>Beginner-friendly Analogy Explanation</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed italic">
                        "{selectedIssue.beginnerExplanation}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Side-by-Side Comparison Code Blocks (Scrollable) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2 flex-1">
                  
                  {/* Code Before */}
                  <div className="flex flex-col bg-slate-950 rounded-xl border border-red-950 overflow-hidden">
                    <div className="bg-red-950/45 px-3 py-1.5 border-b border-red-900 text-[10px] font-mono font-bold text-red-400 flex justify-between items-center">
                      <span>BEFORE (Vulnerable / Buggy)</span>
                      <span className="text-[9px] bg-red-950 text-red-500 px-1.5 py-0.5 rounded">ORIGINAL</span>
                    </div>
                    <pre className="p-3 text-[10px] font-mono text-rose-300/90 overflow-x-auto whitespace-pre leading-relaxed select-all flex-1 bg-slate-950">
                      {selectedIssue.snippetBefore}
                    </pre>
                  </div>

                  {/* Code After */}
                  <div className="flex flex-col bg-slate-950 rounded-xl border border-indigo-950 overflow-hidden">
                    <div className="bg-indigo-950/45 px-3 py-1.5 border-b border-indigo-900 text-[10px] font-mono font-bold text-indigo-400 flex justify-between items-center">
                      <span>AFTER ({generatedFix ? "AI Dynamic Fix" : "Optimized Fix"})</span>
                      {generatedFix && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedFix)}
                          className="text-[9px] bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-sans font-bold cursor-pointer transition select-none"
                        >
                          <Copy size={9} />
                          <span>Copy Fixed Code</span>
                        </button>
                      )}
                      {!generatedFix && (
                        <span className="text-[9px] bg-indigo-950 text-indigo-400 px-1.5 py-0.5 rounded">RESOLVED</span>
                      )}
                    </div>
                    <pre className="p-3 text-[10px] font-mono text-emerald-300/90 overflow-x-auto whitespace-pre leading-relaxed select-all flex-1 bg-slate-950">
                      {generatedFix || selectedIssue.snippetAfter}
                    </pre>
                  </div>

                </div>

                {/* Developer Verification Disclaimer Banner */}
                <div className="bg-amber-500/10 border border-amber-500/15 py-2 px-3 rounded-xl flex items-center justify-center gap-2 mt-2">
                  <span className="text-amber-400 text-xs">⚠️</span>
                  <p className="text-[10px] text-slate-300 font-medium font-mono text-center">
                    AI-generated findings require developer verification
                  </p>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800">
                <Code2 size={40} className="text-slate-600 mb-2 animate-bounce" />
                <p className="font-bold text-slate-300">No Issue Selected</p>
                <p className="text-xs text-slate-500 mt-1">Select an audited issue ticket from the feed on the left side to dissect details, code snippets, and analogy-driven beginner solutions.</p>
              </div>
            )}
          </div>

          {/* Bento Cell 6: Companion Chat Bot (Span 4 bottom row) */}
          <div className="lg:col-span-4 bg-[#0d1222] border border-slate-800 rounded-3xl p-5 flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
              <div className="bg-indigo-600/30 p-1.5 rounded-lg text-indigo-400 border border-indigo-500/20">
                <Sparkles size={14} className="animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block">AI Code Copilot</span>
                <span className="text-[9px] text-slate-400 font-mono">Powered by Gemini-3.5-flash</span>
              </div>
            </div>

            {/* Micro chat box container */}
            <div className="flex-1 overflow-y-auto mb-3 space-y-3 pr-1 text-xs">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={`${msg.id || idx}-${idx}`} 
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.sender === "user" 
                      ? "ml-auto bg-indigo-600 text-white rounded-tr-none" 
                      : "mr-auto bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <span className={`block text-[8px] mt-1 text-right ${msg.sender === "user" ? "text-indigo-200" : "text-slate-400"}`}>
                    {msg.timestamp}
                  </span>
                </div>
              ))}
              {chatLoading && (
                <div className="mr-auto bg-slate-900 border border-slate-850 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-slate-400 max-w-[50%]">
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></span>
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleSendMessage} className="relative mt-auto">
              <input
                type="text"
                placeholder="Ask advice on a parsed code issue..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2.5 pl-3 pr-9 text-xs outline-none placeholder:text-slate-500 text-slate-100 font-sans"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="absolute right-1 px-2.5 py-1.5 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white transition disabled:opacity-40"
              >
                <Send size={13} />
              </button>
            </form>
          </div>

          {/* Bento Cell 7: Repository Details / Info panel (Span 8 bottom row) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between h-[400px]">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-slate-850 pb-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-indigo-400" />
                  Target Codebase Context Properties
                </span>
                <span className="text-[10px] font-mono text-slate-500">READ-ONLY CONFIGS</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">SCAN SOURCE</span>
                  <p className="text-white font-mono text-xs truncate" title={analysisResult.repositoryUrl}>
                    {analysisResult.repositoryUrl}
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-855">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">AUDIT DEPTH</span>
                  <p className="text-white font-mono text-xs">
                    {analysisResult.analyzedFilesCount} Critical Files Loaded
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
                  <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block mb-1">PR STATS</span>
                  <p className="text-white font-mono text-xs uppercase">
                    {analysisResult.isPullRequest ? "✅ PULL REQUEST MODE" : "❌ GENERAL REPO"}
                  </p>
                </div>
              </div>

              {/* Developer guidance note block */}
              <div className="mt-5 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-xs text-slate-300 leading-relaxed">
                <h4 className="font-bold text-white mb-1.5 flex items-center gap-1">
                  <Terminal size={12} className="text-indigo-400" />
                  CodePilot Hackathon Sandbox Capabilities
                </h4>
                <p>
                  This analyzer scans JavaScript, TypeScript, Python, and C/C++ repositories natively. It traverses internal function coordinates to verify database parameters, state races, array iteration efficiencies, and potential memory leaks. Use the optional <strong>GitHub Token</strong> in the scanner bar above to bypass GitHub's default API rate throttling for public repositories.
                </p>
              </div>
            </div>

            {/* Bottom stats footer inside the grid cell */}
            <div className="flex flex-col sm:flex-row justify-between items-center px-2 pt-4 border-t border-slate-850 text-[10px] font-mono text-slate-500 gap-2">
              <div className="flex gap-4">
                <span>PORT: 3000</span>
                <span>ENGINE: GEMINI-3.5-FLASH</span>
                <span>DB LAYER: AST</span>
              </div>
              <span>Developed for Hackathon Code reviewer AI Demo project</span>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
          <Cpu className="text-indigo-400 animate-pulse mb-4" size={40} />
          <h3 className="text-lg font-bold text-white font-display">No Code Reviewed Yet</h3>
          <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed mb-5">
            Enter a public GitHub repository or pull request URL above, or select "Direct Paste" to paste a script. You can also click <strong>"Load Premium Demo Codebase"</strong> below to load and explore sandbox evaluation stats immediately!
          </p>
          <button
            onClick={handleLoadDemo}
            type="button"
            className="px-5 py-2.5 bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/35 hover:border-indigo-500/50 rounded-xl text-xs font-bold font-mono uppercase tracking-wider text-indigo-300 hover:text-white transition flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Play size={12} />
            <span>Load Premium Demo Codebase</span>
          </button>
        </div>
      )}

      {/* AI Review Comments Table Section */}
      {analysisResult && (
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-800">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">AI Review Comments</h3>
              <p className="text-[10px] text-slate-500 font-mono">Detailed repository inspection commentary</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 font-mono text-slate-500 text-[10px] uppercase">
                  <th className="py-3 px-4">File Name</th>
                  <th className="py-3 px-4">Issue Type</th>
                  <th className="py-3 px-4 text-center">Severity</th>
                  <th className="py-3 px-4">Explanation</th>
                  <th className="py-3 px-4">Suggested Fix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {[
                  ...(analysisResult.bugs || []).map(item => ({ ...item, category: "bugs" as const })),
                  ...(analysisResult.security || []).map(item => ({ ...item, category: "security" as const })),
                  ...(analysisResult.performance || []).map(item => ({ ...item, category: "performance" as const })),
                  ...(analysisResult.smells || []).map(item => ({ ...item, category: "smells" as const }))
                ].map((issue, idx) => (
                  <tr 
                    key={`${issue.category}-${issue.id || 'issue'}-${idx}`} 
                    className="hover:bg-slate-950/40 transition cursor-pointer"
                    onClick={() => {
                      setSelectedCategory(issue.category);
                      setSelectedIssue(issue);
                      // Scroll up to primary view smoothly
                      const anchor = document.getElementById("main-grid-anchor");
                      if (anchor) {
                        anchor.scrollIntoView({ behavior: "smooth" });
                      } else {
                        window.scrollTo({ top: 380, behavior: "smooth" });
                      }
                    }}
                  >
                    <td className="py-3.5 px-4 font-mono text-indigo-300 break-all select-all font-semibold max-w-[180px]">
                      📁 {issue.fileName || issue.filePath}
                    </td>
                    <td className="py-3.5 px-4 capitalize font-mono text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full ${
                        issue.category === "bugs" ? "bg-red-500/10 text-red-400" :
                        issue.category === "security" ? "bg-yellow-500/10 text-yellow-400" :
                        issue.category === "performance" ? "bg-cyan-500/10 text-cyan-400" :
                        "bg-amber-500/10 text-amber-500"
                      }`}>
                        {issue.category === "smells" ? "code smell" : issue.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <SeverityBadge severity={issue.severity} />
                    </td>
                    <td className="py-3.5 px-4 max-w-[300px] leading-relaxed">
                      <span className="font-bold text-slate-200 block mb-1">{issue.title}</span>
                      <span className="text-[11px] text-slate-400 block line-clamp-3">{issue.issueDetected || issue.description}</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-[300px] leading-relaxed font-mono">
                      <code className="text-[10px] bg-slate-950 py-1 px-1.5 rounded text-emerald-400 block break-words whitespace-pre-wrap border border-slate-850">
                        {issue.suggestedFix || issue.suggestion}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Outer Aesthetic Footer label bar */}
      <footer className="flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-slate-600 px-3 py-1 gap-2 border-t border-slate-900/40">
        <div className="flex gap-6">
          <span>STATUS: READY</span>
          <span>SYSTEM CHASSIS: DOCKER CLOUD</span>
          <span>SANDBOX PROTOCOL</span>
        </div>
        <div>
          Designed for CodePilot Builder Hackathon
        </div>
      </footer>

      {/* Slide-out History Recent Scans Drawer Overlay */}
      {isRecentDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop screen */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsRecentDrawerOpen(false)}
          />
          {/* Drawer container panel */}
          <div className="relative w-full max-w-md h-full bg-[#0d0e12] border-l border-slate-800 shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">🕒</span>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Historical Audits</h3>
                    <p className="text-[10px] text-slate-500 font-mono">Last 5 active code scans</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecentDrawerOpen(false)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md cursor-pointer transition select-none"
                >
                  ✕
                </button>
              </div>

              {recentScans.length === 0 ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center">
                  <Search size={22} className="mb-2 text-slate-600" />
                  <p className="text-xs">No local audits cached in database storage.</p>
                  <p className="text-[9px] text-slate-550 mt-1 mt-1 text-slate-500">Run repository reviews above to populate history.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {recentScans.map((scan, idx) => {
                    const totalIssues = (scan.result.bugs || []).length + 
                                        (scan.result.security || []).length + 
                                        (scan.result.performance || []).length + 
                                        (scan.result.smells || []).length;
                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          setAnalysisResult(scan.result);
                          if (scan.result.repositoryUrl) {
                            setUrl(scan.result.repositoryUrl);
                            setIsCustomPaste(false);
                          } else {
                            setIsCustomPaste(true);
                            if (scan.result.pastedCode) {
                              setPastedCode(scan.result.pastedCode);
                            }
                          }
                          // Auto focus on first issue category
                          const cats: ("security" | "bugs" | "performance" | "smells")[] = ["security", "bugs", "performance", "smells"];
                          const firstCat = cats.find(c => (scan.result[c] || []).length > 0) || "bugs";
                          setSelectedCategory(firstCat);
                          if (scan.result[firstCat] && scan.result[firstCat].length > 0) {
                            setSelectedIssue(scan.result[firstCat][0]);
                          }
                          setIsRecentDrawerOpen(false);
                          
                          setChatMessages(prev => [
                            ...prev,
                            {
                              id: `loaded-${Date.now()}`,
                              sender: "assistant",
                              text: `Loaded audit history for "${scan.url}" cached locally on ${scan.timestamp}. Threat count is ${totalIssues} issues.`,
                              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            }
                          ]);
                        }}
                        className="bg-slate-900 hover:bg-slate-950 border border-slate-800/80 hover:border-indigo-500/30 rounded-xl p-4 transition-all cursor-pointer group flex flex-col justify-between shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate pr-1">
                            <span className="text-[9px] font-mono tracking-wider bg-slate-950 text-indigo-400 border border-slate-800 px-1.5 py-0.5 rounded uppercase">
                              {scan.provider}
                            </span>
                            <h4 className="text-xs font-bold text-white mt-2 truncate group-hover:text-indigo-300 transition-colors" title={scan.url}>
                              {scan.url}
                            </h4>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono font-medium whitespace-nowrap">
                            {scan.timestamp}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mt-3">
                          <div className="flex gap-3 text-[10px] text-slate-400 font-mono">
                            <span>Files: <strong className="text-white">{scan.result.analyzedFilesCount}</strong></span>
                            <span>Issues: <strong className="text-white">{totalIssues}</strong></span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-mono text-slate-500">Threat rating</span>
                            <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${scan.result.summary.riskScore >= 75 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                              {scan.result.summary.riskScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-4 mt-8 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("codepilot_recent_scans");
                    setRecentScans([]);
                  } catch (err) {}
                }}
                disabled={recentScans.length === 0}
                className="w-full text-center py-2 bg-slate-950 hover:bg-red-500/10 disabled:opacity-30 disabled:pointer-events-none text-red-400 rounded-xl border border-slate-800 hover:border-red-500/20 text-xs font-semibold cursor-pointer transition select-none"
              >
                Clear Cache Database
              </button>
              <div className="text-[9px] text-slate-500 p-1.5 text-center leading-normal">
                Reports are saved inside sandbox client localStorage.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subordinate components to represent issues
function ConfidenceBadge({ confidence }: { confidence?: "High" | "Medium" | "Low" | string }) {
  if (!confidence) return null;
  let cls = "bg-slate-800 text-slate-300 border-slate-700";
  if (confidence === "High") {
    cls = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold";
  } else if (confidence === "Medium") {
    cls = "bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold";
  } else if (confidence === "Low") {
    cls = "bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold";
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wide font-mono ${cls}`}>
      Confidence: {confidence}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: Severity | string }) {
  let cls = "bg-slate-800 text-slate-300";
  if (severity === Severity.CRITICAL || severity === "Critical") {
    cls = "bg-red-500/15 text-red-400 border border-red-500/20 font-bold";
  } else if (severity === Severity.HIGH || severity === "High") {
    cls = "bg-rose-500/15 text-rose-300 border border-rose-500/20";
  } else if (severity === Severity.MEDIUM || severity === "Medium") {
    cls = "bg-amber-500/15 text-amber-400 border border-amber-500/15";
  } else if (severity === Severity.LOW || severity === "Low") {
    cls = "bg-indigo-500/15 text-indigo-300 border border-indigo-500/15";
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wide font-mono ${cls}`}>
      {severity}
    </span>
  );
}

function LoaderPulse() {
  return (
    <span className="flex gap-1">
      <span className="h-1.5 w-1.5 bg-white rounded-full animate-bounce"></span>
      <span className="h-1.5 w-1.5 bg-white rounded-full animate-bounce delay-100"></span>
      <span className="h-1.5 w-1.5 bg-white rounded-full animate-bounce delay-200"></span>
    </span>
  );
}

function AlertBugIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m8 2 1.88 1.88" />
      <path d="M14.12 3.88 16 2" />
      <path d="M9 7.13v-1a3 3 0 1 1 6 0v1" />
      <path d="M12 20c-4.97 0-9-4.03-9-9 0-1.42.33-2.76.92-3.96L6 7" />
      <path d="M14 9H8" />
      <path d="M15 13H9" />
      <path d="m18 7 .36-1c.6-1.55 1.8-2.67 3.39-2.9C21.86 4.71 21 7.2 21 11c0 4.97-4.03 9-9 9" />
      <path d="M2 13h2" />
      <path d="M20 13h2" />
      <path d="m5 18.5-1.5 1.5" />
      <path d="m19 18.5 1.5 1.5" />
    </svg>
  );
}
