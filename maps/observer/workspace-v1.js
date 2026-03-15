/// <reference path="../../node_modules/@workadventure/iframe-api-typings/iframe_api.d.ts" />

let currentActionMessage;
let inspectorWebsite;
let titanState = null;
let terminalBridges = null;
let currentZone = 'overview';
let inspectorMode = 'closed';
const activeZones = new Set();
const zonePriority = ['childDockerA', 'childDockerB', 'childDockerC', 'ubuntuParent', 'windowsHost', 'statusRail', 'githubLane', 'macControl'];

const zones = {
  macControl: { title: 'Mac control desk' },
  githubLane: { title: 'GitHub / planning lane' },
  windowsHost: { title: 'Windows host' },
  ubuntuParent: { title: 'Ubuntu parent env' },
  childDockerA: { title: 'Child Docker A' },
  childDockerB: { title: 'Child Docker B' },
  childDockerC: { title: 'Child Docker C' },
  statusRail: { title: 'Status rail' },
};

async function removeActionMessage() {
  if (currentActionMessage) {
    await currentActionMessage.remove();
    currentActionMessage = undefined;
  }
}

function inspectorUrl(zone = 'overview', mode = 'full') {
  return `./inspector.html?zone=${encodeURIComponent(zone)}&mode=${encodeURIComponent(mode)}&ts=${Date.now()}`;
}

async function openInspector(zoneName = currentZone || 'overview', mode = 'full') {
  currentZone = zoneName;
  inspectorMode = mode;
  if (!inspectorWebsite) {
    inspectorWebsite = await WA.ui.website.open({
      url: inspectorUrl(zoneName, mode),
      visible: true,
      position: { vertical: mode === 'minimized' ? 'bottom' : 'middle', horizontal: 'right' },
      size: mode === 'minimized' ? { width: '280px', height: '92px' } : { width: '430px', height: '82vh' },
      margin: { right: '12px', bottom: mode === 'minimized' ? '12px' : '0px' },
      allowApi: false,
    });
    return;
  }
  inspectorWebsite.visible = true;
  inspectorWebsite.position.vertical = mode === 'minimized' ? 'bottom' : 'middle';
  inspectorWebsite.position.horizontal = 'right';
  inspectorWebsite.size.width = mode === 'minimized' ? '280px' : '430px';
  inspectorWebsite.size.height = mode === 'minimized' ? '92px' : '82vh';
  inspectorWebsite.margin = { right: '12px', bottom: mode === 'minimized' ? '12px' : '0px' };
  inspectorWebsite.url = inspectorUrl(zoneName, mode);
}

async function hideInspector() {
  inspectorMode = 'closed';
  if (inspectorWebsite) inspectorWebsite.visible = false;
}

function getTopZone() {
  for (const zone of zonePriority) {
    if (activeZones.has(zone)) return zone;
  }
  return 'overview';
}

async function fetchTitanState() {
  try {
    const [stateResp, bridgeResp] = await Promise.all([
      fetch('http://maps.workadventure.localhost/observer/state/titan-state.json?ts=' + Date.now(), { cache: 'no-store' }),
      fetch('http://maps.workadventure.localhost/observer/state/terminal-bridges.json?ts=' + Date.now(), { cache: 'no-store' }),
    ]);
    titanState = await stateResp.json();
    terminalBridges = await bridgeResp.json();
  } catch {
    titanState = null;
    terminalBridges = null;
  }
}

function getBridge(key) {
  return terminalBridges?.bridges?.find((b) => b.key === key) || null;
}

function prUrlForName(name) {
  const match = /kueue-pr(\d+)/i.exec(name || '');
  if (!match) return null;
  return `https://github.com/kubernetes-sigs/kueue/pull/${match[1]}`;
}

function currentPrUrl() {
  if (currentZone === 'childDockerA') return prUrlForName(titanState?.containers?.[0]?.name);
  if (currentZone === 'childDockerB') return prUrlForName(titanState?.containers?.[1]?.name);
  if (currentZone === 'childDockerC') return prUrlForName(titanState?.containers?.[2]?.name);
  return (titanState?.containers || []).map((c) => prUrlForName(c.name)).find(Boolean) || null;
}

function terminalInfoForTarget(target = 'context', index = null) {
  if (target === 'titan') return getBridge('titan') || { title: 'Titan Terminal', url: 'http://127.0.0.1:7682' };
  if (target === 'container' && index !== null) return getBridge(`container${index + 1}`) || terminalInfoForTarget('titan');
  if (target === 'context') {
    if (currentZone === 'childDockerA') return terminalInfoForTarget('container', 0);
    if (currentZone === 'childDockerB') return terminalInfoForTarget('container', 1);
    if (currentZone === 'childDockerC') return terminalInfoForTarget('container', 2);
    return terminalInfoForTarget('titan');
  }
  return terminalInfoForTarget('titan');
}

function openTerminal(target = 'context', index = null) {
  const info = terminalInfoForTarget(target, index);
  if (!info?.url) return;
  WA.nav.openTab(info.url);
}

function openExternalUrl(url) {
  if (!url) return;
  WA.nav.openTab(url);
}

function openGithubBoard() {
  WA.nav.openTab('http://maps.workadventure.localhost/observer/github-dashboard.html');
}

function openCurrentPr() {
  const url = currentPrUrl();
  if (url) WA.nav.openTab(url);
  else openGithubBoard();
}

async function applyZoneFocus(zoneName) {
  currentZone = zoneName;
  await removeActionMessage();

  if (zoneName !== 'overview') {
    const zoneHint = zoneName === 'githubLane'
      ? `${zones[zoneName].title}: open work board · inspector = details · shell when ready`
      : `${zones[zoneName].title}: action bar = real actions · Space = inspector`;
    currentActionMessage = WA.ui.displayActionMessage({
      message: zoneHint,
      callback: async () => {
        await openInspector(zoneName, 'full');
      },
    });
  }

  if (inspectorMode !== 'closed') {
    await openInspector(zoneName, inspectorMode === 'minimized' ? 'minimized' : 'full');
  }
}

async function enterZone(zoneName) {
  activeZones.add(zoneName);
  await fetchTitanState();
  await applyZoneFocus(getTopZone());
}

async function leaveZone(zoneName) {
  activeZones.delete(zoneName);
  await applyZoneFocus(getTopZone());
}

window.addEventListener('message', async (ev) => {
  if (ev?.data?.source !== 'workspace-inspector') return;
  if (ev.data.action === 'close') await hideInspector();
  if (ev.data.action === 'minimize') await openInspector(currentZone, 'minimized');
  if (ev.data.action === 'expand') await openInspector(currentZone, 'full');
  if (ev.data.action === 'open-terminal') openTerminal(ev.data.payload?.target || 'context', ev.data.payload?.index ?? null);
  if (ev.data.action === 'open-url') openExternalUrl(ev.data.payload?.url);
  if (ev.data.action === 'open-dashboard') openGithubBoard();
  if (ev.data.action === 'open-current-pr') openCurrentPr();
});

WA.onInit().then(async () => {
  await fetchTitanState();

  for (const zoneName of Object.keys(zones)) {
    WA.room.area.onEnter(zoneName).subscribe(() => { enterZone(zoneName); });
    WA.room.area.onLeave(zoneName).subscribe(() => { leaveZone(zoneName); });
  }

  // Create embedded GitHub dashboard over the GitHub lane
  try {
    WA.room.website.create({
      name: "github_dashboard",
      url: "./github-dashboard.html",
      position: { x: 74, y: 564, width: 300, height: 268 }, 
      visible: true,
      allowApi: true,
      origin: "map",
      scale: 1,
    });
  } catch (e) {
    console.error("Failed to create github dashboard website", e);
  }

  WA.ui.actionBar.addButton({
    id: 'workspace-inspector',
    label: 'Inspector',
    callback: async () => {
      if (inspectorMode === 'closed') await openInspector(currentZone || 'overview', 'full');
      else await hideInspector();
    }
  });

  WA.ui.actionBar.addButton({
    id: 'workspace-context-shell',
    label: 'Context Shell',
    callback: () => openTerminal('context')
  });

  WA.ui.actionBar.addButton({
    id: 'workspace-titan-shell',
    label: 'Titan Shell',
    callback: () => openTerminal('titan')
  });

  WA.ui.actionBar.addButton({
    id: 'workspace-work-board',
    label: 'Work Board',
    callback: () => openGithubBoard()
  });

  WA.ui.actionBar.addButton({
    id: 'workspace-current-pr',
    label: 'Current PR',
    callback: () => openCurrentPr()
  });

  setInterval(fetchTitanState, 4000);
});
