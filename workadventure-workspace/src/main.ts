/// <reference types="@workadventure/iframe-api-typings" />

const WORKSPACE_ID = 'e2e-fix';
const WORKSPACE_BASE_URL = `http://127.0.0.1:5174/?workspace=${WORKSPACE_ID}`;
const TASK_BOARD_URL = `http://127.0.0.1:5174/apps/task-board.html?workspace=${WORKSPACE_ID}`;
const DEFAULT_TASK_SUMMARY_URL = 'http://127.0.0.1:4180/task/summary';
const DEFAULT_TASKS_URL = 'http://127.0.0.1:4180/tasks';

type ActionHandle = ReturnType<typeof WA.ui.displayActionMessage>;
type TaskSummary = {
  headline?: string;
  repoName?: string;
  branch?: string;
  changedFileCount?: number;
  statusLine?: string;
};

type TaskEntity = {
  id: string;
  title?: string;
  prompt?: string;
  summary?: string;
  status?: string;
  workspaceTaskId?: string;
};

type TaskStation = {
  area: string;
  anchor: string;
  title: string;
  prompt: string;
  taskId?: string;
  directUrl?: string;
};

const taskHub: TaskStation = {
  area: 'taskHubArea',
  anchor: 'taskHubPopupAnchor',
  title: 'Task Briefing Room',
  prompt: 'Open task board?',
  taskId: 'task-hub',
  directUrl: TASK_BOARD_URL,
};

const taskStations: TaskStation[] = [
  {
    area: 'taskInvestigateArea',
    anchor: 'taskInvestigateAnchor',
    title: 'Task · Investigate Current Fix',
    prompt: 'Enter current task workspace?',
    taskId: 'task-investigate',
  },
  {
    area: 'taskCodeArea',
    anchor: 'taskCodeAnchor',
    title: 'Task · Code Review / Diff',
    prompt: 'Open code review workspace?',
    taskId: 'task-code',
  },
  {
    area: 'taskRuntimeArea',
    anchor: 'taskRuntimeAnchor',
    title: 'Task · Runtime / Docker Watch',
    prompt: 'Open runtime watch workspace?',
    taskId: 'task-runtime',
  },
];

let activeAction: ActionHandle | undefined;
let activeCoWebsite: Awaited<ReturnType<typeof WA.nav.openCoWebSite>> | undefined;
let latestTaskSummary: TaskSummary | undefined;
let latestTaskEntities: Record<string, TaskEntity> = {};

function buildWorkspaceUrl(taskId?: string): string {
  const url = new URL(WORKSPACE_BASE_URL);
  if (taskId) url.searchParams.set('task', taskId);
  return url.toString();
}

function getStationUrl(station: TaskStation): string {
  return station.directUrl ?? buildWorkspaceUrl(station.taskId);
}

function getTaskSummaryUrl(): string {
  return DEFAULT_TASK_SUMMARY_URL;
}

function getTasksUrl(): string {
  return DEFAULT_TASKS_URL;
}

async function refreshTaskSummary(): Promise<void> {
  try {
    const response = await fetch(`${getTaskSummaryUrl()}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`task summary http ${response.status}`);
    latestTaskSummary = (await response.json()) as TaskSummary;
  } catch (error) {
    console.warn('Unable to fetch task summary for e2e-fix room', error);
  }
}

async function refreshTaskEntities(): Promise<void> {
  try {
    const response = await fetch(`${getTasksUrl()}?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`tasks http ${response.status}`);
    const payload = await response.json() as { tasks?: TaskEntity[] };
    latestTaskEntities = Object.fromEntries((payload.tasks || []).map((task) => [task.id, task]));
  } catch (error) {
    console.warn('Unable to fetch task entities for e2e-fix room', error);
  }
}

function buildPopupMessage(station: TaskStation): string {
  const entity = station.taskId ? latestTaskEntities[station.taskId] : undefined;
  const lines = [entity?.prompt || station.prompt];

  if (entity?.title) {
    lines.push(entity.title);
  }

  if (station.taskId === 'task-investigate') {
    const headline = entity?.summary || latestTaskSummary?.headline?.trim();
    if (headline) lines.push(headline);
  } else if (station.taskId === 'task-hub') {
    const headline = latestTaskSummary?.headline?.trim();
    if (headline) lines.push(`Current: ${headline}`);
  } else if (entity?.summary) {
    lines.push(entity.summary);
  }
  return lines.join('\n');
}

async function clearAction(): Promise<void> {
  if (!activeAction) return;
  try {
    await activeAction.remove();
  } catch (error) {
    console.warn('Unable to remove current action message', error);
  }
  activeAction = undefined;
}

async function openStation(station: TaskStation): Promise<void> {
  await clearAction();

  if (activeCoWebsite) {
    try {
      activeCoWebsite.close();
    } catch (error) {
      console.warn('Unable to close previous co-website', error);
    }
  }

  activeCoWebsite = await WA.nav.openCoWebSite(getStationUrl(station), false, '', 70, 0, true, false);
}

function openStationInTab(station: TaskStation): void {
  void clearAction();
  WA.nav.openTab(getStationUrl(station));
}

async function showActionForStation(station: TaskStation): Promise<void> {
  await clearAction();

  activeAction = WA.ui.displayActionMessage({
    message: buildPopupMessage(station),
    callback: () => {
      void openStation(station);
    },
  });
}

async function bindStation(station: TaskStation): Promise<void> {
  WA.room.area.onEnter(station.area).subscribe(async () => {
    await refreshTaskSummary();
    await refreshTaskEntities();
    await showActionForStation(station);
  });

  WA.room.area.onLeave(station.area).subscribe(() => {
    void clearAction();
  });
}

WA.onInit()
  .then(async () => {
    console.info('e2e-fix task room ready');
    await refreshTaskSummary();
    await refreshTaskEntities();
    const defaultStation = taskStations[0];

    await bindStation(taskHub);
    for (const station of taskStations) {
      await bindStation(station);
    }

    WA.ui.registerMenuCommand('Open task board', {
      callback: () => {
        void openStation(taskHub);
      },
      key: 'open-task-board',
    });

    WA.ui.registerMenuCommand('Open e2e-fix workspace', {
      callback: () => {
        if (defaultStation) void openStation(defaultStation);
      },
      key: 'open-e2e-fix-workspace',
    });

    WA.ui.registerMenuCommand('Open e2e-fix in browser tab', {
      callback: () => {
        if (defaultStation) openStationInTab(defaultStation);
      },
      key: 'open-e2e-fix-workspace-tab',
    });

    setInterval(() => {
      void refreshTaskSummary();
      void refreshTaskEntities();
    }, 30000);
  })
  .catch((error) => console.error('Failed to initialize e2e-fix task room', error));

export {};
