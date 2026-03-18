export type WorkspaceNodeType = 'web' | 'terminal' | 'review' | 'files';
export type DockDirection = 'above' | 'below' | 'left' | 'right' | 'within';

export interface LayoutStep {
  id: string;
  position?: {
    referencePanel: string;
    direction: DockDirection;
  };
}

export interface ReviewSection {
  title: string;
  items: string[];
}

export interface ReviewSummary {
  headline: string;
  sections: ReviewSection[];
}

export interface WorkspaceNode {
  id: string;
  title: string;
  type: WorkspaceNodeType;
  status: string;
  icon?: string;
  url?: string;
  fileServiceUrl?: string;
  editableUrl?: boolean;
  externalLabel?: string;
  help?: string[];
  summary?: ReviewSummary;
}

export interface WorkspaceConfig {
  id: string;
  title: string;
  description: string;
  layout: {
    storageKey: string;
    steps: LayoutStep[];
  };
  nodes: WorkspaceNode[];
}
