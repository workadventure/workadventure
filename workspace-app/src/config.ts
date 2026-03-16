import e2eFixWorkspace from '../../workspace-config/e2e-fix.json';
import eslintPr438Workspace from '../../workspace-config/eslint-pr438.json';
import type { WorkspaceConfig } from './types';

const workspaceCatalog: Record<string, WorkspaceConfig> = {
  'e2e-fix': e2eFixWorkspace as WorkspaceConfig,
  'eslint-pr438': eslintPr438Workspace as WorkspaceConfig,
};

export function getWorkspaceConfig(workspaceId: string | null): WorkspaceConfig | undefined {
  if (!workspaceId) {
    return workspaceCatalog['e2e-fix'];
  }

  return workspaceCatalog[workspaceId];
}
