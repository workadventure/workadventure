import e2eFixWorkspace from '../../workspace-config/e2e-fix.json';
import type { WorkspaceConfig } from './types';

const workspaceCatalog: Record<string, WorkspaceConfig> = {
  'e2e-fix': e2eFixWorkspace as WorkspaceConfig,
};

export function getWorkspaceConfig(workspaceId: string | null): WorkspaceConfig | undefined {
  if (!workspaceId) {
    return workspaceCatalog['e2e-fix'];
  }

  return workspaceCatalog[workspaceId];
}
