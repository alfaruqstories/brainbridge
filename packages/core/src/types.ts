export type Classification =
  | "portable"
  | "regenerable"
  | "obsidian_specific"
  | "plugin_dependent"
  | "external_state";

export type FindingSeverity = "info" | "warning" | "risk";

export interface Finding {
  classification: Classification;
  severity: FindingSeverity;
  title: string;
  path?: string;
  detail: string;
}

export interface VaultFile {
  path: string;
  kind:
    | "markdown"
    | "canvas"
    | "base"
    | "attachment"
    | "obsidian_config"
    | "plugin_manifest"
    | "other";
}

export interface WikiLink {
  source: string;
  raw: string;
  target: string;
  alias?: string;
  heading?: string;
  blockReference?: string;
  embed: boolean;
  syntax?: "wiki" | "markdown";
  resolvedPath?: string;
}

export interface AttachmentReference {
  source: string;
  target: string;
  resolvedPath?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  path: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  unresolved?: boolean;
}

export interface PluginInfo {
  id: string;
  name?: string;
  version?: string;
  path?: string;
  enabled: boolean;
}

export interface CanvasInfo {
  path: string;
  nodes: CanvasNodeInfo[];
  edges: CanvasEdgeInfo[];
  fileNodes: string[];
  textNodeCount: number;
  edgeCount: number;
}

export interface BaseInfo {
  path: string;
  sourceText: string;
}

export interface CanvasNodeInfo {
  id: string;
  type: string;
  label: string;
  file?: string;
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface CanvasEdgeInfo {
  id: string;
  fromNode: string;
  toNode: string;
  label?: string;
}

export interface MarkdownFallback {
  path: string;
  reasons: string[];
  content: string;
}

export interface TaskItem {
  source: string;
  line: number;
  text: string;
  completed: boolean;
}

export interface NoteProperties {
  path: string;
  frontmatter: Record<string, unknown>;
}

export interface VaultReport {
  vaultPath: string;
  generatedAt: string;
  summary: {
    files: number;
    markdownFiles: number;
    attachments: number;
    findings: number;
    portabilityScore: number;
  };
  files: VaultFile[];
  plugins: PluginInfo[];
  findings: Finding[];
  wikilinks: WikiLink[];
  attachmentReferences: AttachmentReference[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  canvases: CanvasInfo[];
  bases: BaseInfo[];
  markdownFallbacks: MarkdownFallback[];
  tasks: TaskItem[];
  properties: NoteProperties[];
}

export interface ScanOptions {
  now?: Date;
}

export interface WriteArtifactsOptions {
  outDir: string;
  includeVaultCopy?: boolean;
}
