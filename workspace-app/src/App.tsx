import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  DockviewReact,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps,
  type SerializedDockview,
} from 'dockview';
import type { IWatermarkPanelProps } from 'dockview-core';
import {
  Crosshair,
  ExternalLink,
  Maximize2,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import { getWorkspaceConfig } from './config';
import { FileManagerPanel } from './file-manager';
import { WorkspaceNodeIcon } from './icons';
import type { WorkspaceConfig, WorkspaceNode } from './types';
import './App.css';

type PanelParams = {
  nodeId: string;
};

type WorkspaceContextValue = {
  workspace: WorkspaceConfig;
  nodesById: Record<string, WorkspaceNode>;
  urlOverrides: Record<string, string>;
  openPanelIds: string[];
  activePanelId?: string;
  minimizedPanelIds: string[];
  setNodeUrl: (nodeId: string, url: string) => void;
  resetNodeUrl: (nodeId: string) => void;
  minimizeNode: (nodeId: string) => void;
  openNodeFromDock: (nodeId: string) => void;
};

type NodeStateTone = 'active' | 'open' | 'docked' | 'closed';

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const URL_STORAGE_PREFIX = 'saved-workspace-url-overrides:';

function readSearchParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

function readWorkspaceId(): string | null {
  return readSearchParams().get('workspace');
}

function shouldResetLayoutFromUrl(): boolean {
  const value = readSearchParams().get('resetLayout');
  return value === '1' || value === 'true';
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key: string, value: unknown): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getUrlStorageKey(workspaceId: string): string {
  return `${URL_STORAGE_PREFIX}${workspaceId}`;
}

function resolveNodeUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;

  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  return new URL(rawUrl, window.location.origin).toString();
}

function getNodeTypeLabel(node: WorkspaceNode): string {
  switch (node.type) {
    case 'web':
      return 'Web app';
    case 'terminal':
      return 'Terminal';
    case 'review':
      return 'Summary';
    case 'files':
      return 'Finder';
    default:
      return 'Node';
  }
}

function getNodeStateMeta(
  nodeId: string,
  openPanelIds: string[],
  activePanelId: string | undefined,
  minimizedPanelIds: string[],
): { label: string; tone: NodeStateTone } {
  const isOpen = openPanelIds.includes(nodeId);
  const isActive = activePanelId === nodeId;
  const isMinimized = minimizedPanelIds.includes(nodeId) && !isOpen;

  if (isActive) {
    return { label: 'Active', tone: 'active' };
  }

  if (isOpen) {
    return { label: 'Open', tone: 'open' };
  }

  if (isMinimized) {
    return { label: 'Docked', tone: 'docked' };
  }

  return { label: 'Closed', tone: 'closed' };
}

function useWorkspaceContext(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);

  if (!value) {
    throw new Error('Workspace context is not available');
  }

  return value;
}

function buildDefaultLayout(api: DockviewApi): void {
  api.clear();
}

function persistLayout(workspace: WorkspaceConfig, api: DockviewApi): void {
  writeJsonStorage(workspace.layout.storageKey, api.toJSON());
}

function getFloatingWindowOptions(
  workspace: WorkspaceConfig,
  node: WorkspaceNode,
  openCount: number,
): { width: number; height: number; x: number; y: number } {
  const isTerminal = node.type === 'terminal';
  const isFinder = node.type === 'files';
  const isReview = node.type === 'review';
  const isWeb = node.type === 'web';
  const baseWidth = isTerminal ? 980 : isFinder ? 920 : isReview ? 760 : isWeb ? 960 : 840;
  const baseHeight = isTerminal ? 680 : isFinder ? 640 : isReview ? 560 : 720;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(baseWidth, Math.max(640, viewportWidth - 280));
  const height = Math.min(baseHeight, Math.max(420, viewportHeight - 220));
  const nodeIndex = Math.max(0, workspace.nodes.findIndex((entry) => entry.id === node.id));
  const cascadeOffset = (openCount + nodeIndex) % 6;
  const x = Math.max(28, Math.min(160 + cascadeOffset * 28, viewportWidth - width - 36));
  const y = Math.max(28, Math.min(92 + cascadeOffset * 24, viewportHeight - height - 120));

  return { width, height, x, y };
}

function syncPanelsWithConfig(api: DockviewApi, workspace: WorkspaceConfig): void {
  workspace.nodes.forEach((node) => {
    const panel = api.getPanel(node.id);

    if (!panel) return;

    panel.api.setTitle(node.title);
    panel.api.updateParameters({ nodeId: node.id });
  });
}

function openOrFocusNode(
  api: DockviewApi,
  workspace: WorkspaceConfig,
  nodesById: Record<string, WorkspaceNode>,
  nodeId: string,
): 'opened' | 'focused' | 'missing' {
  const existingPanel = api.getPanel(nodeId);

  if (existingPanel) {
    existingPanel.api.setActive();
    return 'focused';
  }

  const node = nodesById[nodeId];
  if (!node) {
    return 'missing';
  }

  const floating = getFloatingWindowOptions(workspace, node, api.panels.length);
  const options: {
    id: string;
    component: 'workspaceNode';
    title: string;
    params: PanelParams;
    floating: {
      width: number;
      height: number;
      x: number;
      y: number;
    };
  } = {
    id: node.id,
    component: 'workspaceNode',
    title: node.title,
    params: { nodeId: node.id },
    floating,
  };

  api.addPanel(options);
  api.getPanel(nodeId)?.api.setActive();
  return 'opened';
}

function loadLayout(
  api: DockviewApi,
  workspace: WorkspaceConfig,
  options?: { forceReset?: boolean },
): void {
  if (options?.forceReset) {
    window.localStorage.removeItem(workspace.layout.storageKey);
    buildDefaultLayout(api);
    return;
  }

  const rawLayout = window.localStorage.getItem(workspace.layout.storageKey);

  if (!rawLayout) {
    buildDefaultLayout(api);
    return;
  }

  try {
    api.fromJSON(JSON.parse(rawLayout) as SerializedDockview, { reuseExistingPanels: false });
    syncPanelsWithConfig(api, workspace);

    if (api.panels.length === 0 || api.groups.length === 0) {
      throw new Error('Saved layout produced no visible dockview panels');
    }
  } catch (error) {
    console.warn('Failed to load saved layout, falling back to default layout', error);
    window.localStorage.removeItem(workspace.layout.storageKey);
    buildDefaultLayout(api);
  }
}

function PanelIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button type="button" className="panel-icon-button" title={label} aria-label={label} onClick={onClick}>
      <Icon size={14} strokeWidth={2.25} />
    </button>
  );
}

function WorkspaceTab(props: IDockviewPanelHeaderProps<PanelParams>): ReactNode {
  const { minimizeNode, nodesById } = useWorkspaceContext();
  const node = nodesById[props.params.nodeId];

  if (!node) {
    return <div className="workspace-tab">{props.api.title ?? props.params.nodeId}</div>;
  }

  const handleMinimize = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    minimizeNode(node.id);
  };

  return (
    <div className="workspace-tab">
      <WorkspaceNodeIcon node={node} variant="tab" className="workspace-tab__icon" />
      <span className="workspace-tab__title">{node.title}</span>
      {props.tabLocation === 'header' ? (
        <button
          type="button"
          className="workspace-tab__minimize"
          aria-label={`Minimize ${node.title} to dock`}
          title={`Minimize ${node.title} to dock`}
          onClick={handleMinimize}
        >
          <Minus size={12} strokeWidth={2.3} />
        </button>
      ) : null}
    </div>
  );
}

function WorkspaceNodePanel(props: IDockviewPanelProps<PanelParams>): ReactNode {
  const { minimizeNode, nodesById, resetNodeUrl, setNodeUrl, urlOverrides } = useWorkspaceContext();
  const node = nodesById[props.params.nodeId];
  const rawUrl = node ? (urlOverrides[node.id] ?? node.url) : undefined;
  const resolvedUrl = resolveNodeUrl(rawUrl);
  const [draftUrl, setDraftUrl] = useState(rawUrl ?? '');

  useEffect(() => {
    setDraftUrl(rawUrl ?? '');
  }, [rawUrl]);

  if (!node) {
    return <div className="node-panel__empty">Missing app configuration.</div>;
  }

  const toggleFullscreen = (): void => {
    if (props.api.isMaximized()) {
      props.api.exitMaximized();
      return;
    }

    props.api.maximize();
  };

  const openExternal = (): void => {
    if (!resolvedUrl) return;
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  };

  const applyUrl = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setNodeUrl(node.id, draftUrl.trim());
  };

  return (
    <div className="node-panel">
      <header className="node-panel__header">
        <div className="node-panel__identity">
          <WorkspaceNodeIcon node={node} variant="sidebar" className="node-panel__icon" />
          <div>
            <div className="node-panel__title-row">
              <div className="node-panel__title">{node.title}</div>
              <span className="node-panel__kind">{getNodeTypeLabel(node)}</span>
            </div>
            <div className="node-panel__status">{node.status}</div>
          </div>
        </div>
        <div className="node-panel__actions">
          <PanelIconButton icon={Crosshair} label={`Focus ${node.title}`} onClick={() => props.api.setActive()} />
          <PanelIconButton icon={Minus} label={`Minimize ${node.title}`} onClick={() => minimizeNode(node.id)} />
          <PanelIconButton
            icon={Maximize2}
            label={props.api.isMaximized() ? `Exit fullscreen for ${node.title}` : `Fullscreen ${node.title}`}
            onClick={toggleFullscreen}
          />
          {resolvedUrl ? (
            <PanelIconButton
              icon={ExternalLink}
              label={node.externalLabel ?? `Open ${node.title} externally`}
              onClick={openExternal}
            />
          ) : null}
        </div>
      </header>

      {node.type === 'files' ? (
        <FileManagerPanel node={node} />
      ) : node.type === 'review' ? (
        <ReviewPanel node={node} />
      ) : (
        <>
          {node.editableUrl ? (
            <form className="node-panel__urlbar" onSubmit={applyUrl}>
              <div className="node-panel__urlfield">
                <label className="node-panel__urlcaption" htmlFor={`${node.id}-url`}>
                  App URL
                </label>
                <input
                  id={`${node.id}-url`}
                  aria-label={`${node.title} url`}
                  value={draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                  placeholder="Enter iframe-safe URL"
                />
              </div>
              <button type="submit" className="panel-pill-button panel-pill-button--primary">
                Apply
              </button>
              <button
                type="button"
                className="panel-pill-button"
                onClick={() => {
                  resetNodeUrl(node.id);
                  setDraftUrl(node.url ?? '');
                }}
              >
                Reset
              </button>
            </form>
          ) : null}

          {node.help?.length ? (
            <div className="node-panel__help">
              {node.help.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </div>
          ) : null}

          {resolvedUrl ? (
            <iframe
              className="node-panel__frame"
              src={resolvedUrl}
              title={node.title}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="node-panel__empty">No URL configured for this app yet.</div>
          )}
        </>
      )}
    </div>
  );
}

function ReviewPanel({ node }: { node: WorkspaceNode }): ReactNode {
  if (!node.summary) {
    return <div className="node-panel__empty">No review summary configured.</div>;
  }

  return (
    <div className="review-panel">
      <div className="review-panel__headline">{node.summary.headline}</div>
      {node.summary.sections.map((section) => (
        <section className="review-panel__section" key={section.title}>
          <h3>{section.title}</h3>
          <ul>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function WorkspaceDesktopWatermark(_props: IWatermarkPanelProps): ReactNode {
  return null;
}

function UnsupportedWorkspace({ workspaceId }: { workspaceId: string | null }): ReactNode {
  return (
    <main className="unsupported-workspace">
      <h1>Unsupported workspace</h1>
      <p>This MVP only ships one named workspace: <strong>e2e-fix</strong>.</p>
      <p>Requested workspace: <code>{workspaceId ?? '(none)'}</code></p>
      <p>Open <code>?workspace=e2e-fix</code> to continue.</p>
    </main>
  );
}

const dockComponents = {
  workspaceNode: (props: IDockviewPanelProps<PanelParams>) => <WorkspaceNodePanel {...props} />,
};

function App(): ReactNode {
  const workspaceId = readWorkspaceId();
  const workspace = useMemo(() => getWorkspaceConfig(workspaceId), [workspaceId]);
  const apiRef = useRef<DockviewApi | null>(null);
  const [openPanelIds, setOpenPanelIds] = useState<string[]>([]);
  const [activePanelId, setActivePanelId] = useState<string | undefined>();
  const [minimizedPanelIds, setMinimizedPanelIds] = useState<string[]>([]);

  const nodesById = useMemo(() => {
    if (!workspace) return {};
    return Object.fromEntries(workspace.nodes.map((node) => [node.id, node]));
  }, [workspace]);

  const [urlOverrides, setUrlOverrides] = useState<Record<string, string>>(() =>
    workspace ? readJsonStorage<Record<string, string>>(getUrlStorageKey(workspace.id), {}) : {},
  );

  const syncPanelState = useCallback((api: DockviewApi) => {
    setOpenPanelIds(api.panels.map((panel) => panel.id));
    setActivePanelId(api.activePanel?.id);
  }, []);

  const setNodeUrl = useCallback(
    (nodeId: string, url: string) => {
      if (!workspace) return;

      setUrlOverrides((current) => {
        const next = { ...current, [nodeId]: url };
        writeJsonStorage(getUrlStorageKey(workspace.id), next);
        return next;
      });
    },
    [workspace],
  );

  const resetNodeUrl = useCallback(
    (nodeId: string) => {
      if (!workspace) return;

      setUrlOverrides((current) => {
        const next = { ...current };
        delete next[nodeId];
        writeJsonStorage(getUrlStorageKey(workspace.id), next);
        return next;
      });
    },
    [workspace],
  );

  const openNodeFromDock = useCallback(
    (nodeId: string) => {
      if (!workspace || !apiRef.current) return;

      const result = openOrFocusNode(apiRef.current, workspace, nodesById, nodeId);
      setMinimizedPanelIds((current) => current.filter((id) => id !== nodeId));
      syncPanelState(apiRef.current);
      if (result === 'opened') {
        persistLayout(workspace, apiRef.current);
      }
    },
    [nodesById, syncPanelState, workspace],
  );

  const minimizeNode = useCallback(
    (nodeId: string) => {
      if (!apiRef.current) return;

      const panel = apiRef.current.getPanel(nodeId);
      if (!panel) return;

      panel.api.close();
      setMinimizedPanelIds((current) => (current.includes(nodeId) ? current : [...current, nodeId]));
      syncPanelState(apiRef.current);
      if (workspace) {
        persistLayout(workspace, apiRef.current);
      }
    },
    [syncPanelState, workspace],
  );

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      if (!workspace) return;

      apiRef.current = event.api;
      const forceReset = shouldResetLayoutFromUrl();
      loadLayout(event.api, workspace, { forceReset });
      syncPanelsWithConfig(event.api, workspace);
      syncPanelState(event.api);
      setMinimizedPanelIds([]);

      event.api.onDidAddPanel((panel) => {
        setMinimizedPanelIds((current) => current.filter((id) => id !== panel.id));
        syncPanelState(event.api);
      });

      event.api.onDidRemovePanel((panel) => {
        if (nodesById[panel.id]) {
          setMinimizedPanelIds((current) => (current.includes(panel.id) ? current : [...current, panel.id]));
        }
        syncPanelState(event.api);
      });

      event.api.onDidActivePanelChange(() => {
        syncPanelState(event.api);
      });

      event.api.onDidLayoutChange(() => {
        persistLayout(workspace, event.api);
      });
    },
    [nodesById, syncPanelState, workspace],
  );

  if (!workspace) {
    return <UnsupportedWorkspace workspaceId={workspaceId} />;
  }

  const contextValue: WorkspaceContextValue = {
    workspace,
    nodesById,
    urlOverrides,
    openPanelIds,
    activePanelId,
    minimizedPanelIds,
    setNodeUrl,
    resetNodeUrl,
    minimizeNode,
    openNodeFromDock,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      <div className="workspace-app workspace-app--desktop-only">
        <main className="workspace-desktop">
          <div className="workspace-dockview dockview-theme-dark">
            <DockviewReact
              components={dockComponents}
              defaultTabComponent={WorkspaceTab}
              watermarkComponent={WorkspaceDesktopWatermark}
              onReady={onReady}
            />
          </div>
        </main>

        <footer className="workspace-dock" role="toolbar" aria-label="Workspace dock">
          <div className="workspace-dock__tray">
            {workspace.nodes.map((node) => {
              const state = getNodeStateMeta(node.id, openPanelIds, activePanelId, minimizedPanelIds);

              return (
                <button
                  key={node.id}
                  type="button"
                  className={`workspace-dock__item workspace-dock__item--${state.tone}`}
                  title={`${node.title} · ${state.label}`}
                  aria-label={`${node.title} · ${state.label}`}
                  onClick={() => openNodeFromDock(node.id)}
                >
                  <WorkspaceNodeIcon node={node} variant="dock" className="workspace-dock__icon" />
                  <span className="workspace-dock__dot" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </footer>
      </div>
    </WorkspaceContext.Provider>
  );
}

export default App;
