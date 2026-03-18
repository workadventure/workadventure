import type { CSSProperties, ReactNode } from 'react';
import { siDocker, siGithub, siUbuntu, type SimpleIcon } from 'simple-icons';
import type { WorkspaceNode } from './types';

type IconVariant = 'tab' | 'dock' | 'sidebar';

type IconAsset =
  | {
      type: 'simple';
      icon: SimpleIcon;
    }
  | {
      type: 'path';
      viewBox: string;
      path: string;
    };

type IconBadge =
  | {
      type: 'text';
      label: string;
      bg: string;
      fg: string;
    }
  | {
      type: 'simple';
      icon: SimpleIcon;
      bg: string;
      fg: string;
    };

type IconSpec = {
  asset: IconAsset;
  bg: string;
  fg: string;
  badge?: IconBadge;
};

// Source: OpenAI brand page blossom mark, simplified into a local path for the dock/tab icon.
const OPENAI_BLOSSOM_PATH =
  'M249.176 323.434V298.276C249.176 296.158 249.971 294.569 251.825 293.509L302.406 264.381C309.29 260.409 317.5 258.555 325.973 258.555C357.75 258.555 377.877 283.185 377.877 309.399C377.877 311.253 377.877 313.371 377.611 315.49L325.178 284.771C322.001 282.919 318.822 282.919 315.645 284.771L249.176 323.434ZM367.283 421.415V361.301C367.283 357.592 365.694 354.945 362.516 353.092L296.048 314.43L317.763 301.982C319.617 300.925 321.206 300.925 323.058 301.982L373.639 331.112C388.205 339.586 398.003 357.592 398.003 375.069C398.003 395.195 386.087 413.733 367.283 421.412V421.415ZM233.553 368.452L211.838 355.742C209.986 354.684 209.19 353.095 209.19 350.975V292.718C209.19 264.383 230.905 242.932 260.301 242.932C271.423 242.932 281.748 246.641 290.49 253.26L238.321 283.449C235.146 285.303 233.555 287.951 233.555 291.659V368.455L233.553 368.452ZM280.292 395.462L249.176 377.985V340.913L280.292 323.436L311.407 340.913V377.985L280.292 395.462ZM300.286 475.968C289.163 475.968 278.837 472.259 270.097 465.64L322.264 435.449C325.441 433.597 327.03 430.949 327.03 427.239V350.445L349.011 363.155C350.865 364.213 351.66 365.802 351.66 367.922V426.179C351.66 454.514 329.679 475.965 300.286 475.965V475.968ZM237.525 416.915L186.944 387.785C172.378 379.31 162.582 361.305 162.582 343.827C162.582 323.436 174.763 305.164 193.563 297.485V357.861C193.563 361.571 195.154 364.217 198.33 366.071L264.535 404.467L242.82 416.915C240.967 417.972 239.377 417.972 237.525 416.915ZM234.614 460.343C204.689 460.343 182.71 437.833 182.71 410.028C182.71 407.91 182.976 405.792 183.238 403.672L235.405 433.863C238.582 435.715 241.763 435.715 244.938 433.863L311.407 395.466V420.622C311.407 422.742 310.612 424.331 308.758 425.389L258.179 454.519C251.293 458.491 243.083 460.343 234.611 460.343H234.614ZM300.286 491.854C332.329 491.854 359.073 469.082 365.167 438.892C394.825 431.211 413.892 403.406 413.892 375.073C413.892 356.535 405.948 338.529 391.648 325.552C392.972 319.991 393.766 314.43 393.766 308.87C393.766 271.003 363.048 242.666 327.562 242.666C320.413 242.666 313.528 243.723 306.644 246.109C294.725 234.457 278.307 227.042 260.301 227.042C228.258 227.042 201.513 249.815 195.42 280.004C165.761 287.685 146.694 315.49 146.694 343.824C146.694 362.362 154.638 380.368 168.938 393.344C167.613 398.906 166.819 404.467 166.819 410.027C166.819 447.894 197.538 476.231 233.024 476.231C240.172 476.231 247.058 475.173 253.943 472.788C265.859 484.441 282.278 491.854 300.286 491.854Z';

const REVIEW_ICON_PATH =
  'M8 3.75A2.25 2.25 0 0 0 5.75 6v12A2.25 2.25 0 0 0 8 20.25h8A2.25 2.25 0 0 0 18.25 18V9.56a2.25 2.25 0 0 0-.66-1.59l-3.56-3.56a2.25 2.25 0 0 0-1.59-.66H8Zm4.5 1.8v3.2c0 .41.34.75.75.75h3.2V18A.75.75 0 0 1 15.7 18.75H8A.75.75 0 0 1 7.25 18V6A.75.75 0 0 1 8 5.25h4.5ZM9 11.25c0-.41.34-.75.75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 9 11.25Zm0 3c0-.41.34-.75.75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 9 14.25Zm0 3c0-.41.34-.75.75-.75h3a.75.75 0 0 1 0 1.5h-3A.75.75 0 0 1 9 17.25Z';

const FINDER_ICON_PATH =
  'M4.5 5.25A2.25 2.25 0 0 1 6.75 3h3.02c.5 0 .97.2 1.32.55l1.13 1.13c.35.35.82.55 1.31.55h3.72A2.25 2.25 0 0 1 19.5 7.5v9.75a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 17.25V5.25Zm1.5 3.75v8.25c0 .41.34.75.75.75h10.5a.75.75 0 0 0 .75-.75V9H6Zm0-1.5h12V7.5a.75.75 0 0 0-.75-.75h-3.72a3.37 3.37 0 0 1-2.37-.98l-1.13-1.12a.37.37 0 0 0-.27-.12H6.75A.75.75 0 0 0 6 5.25V7.5Zm2.25 4.13c0-.31.25-.56.56-.56h2.44c.31 0 .56.25.56.56s-.25.56-.56.56H8.8a.56.56 0 0 1-.55-.56Zm4.69 0c0-.31.25-.56.56-.56h1.69c.31 0 .56.25.56.56s-.25.56-.56.56H13.5a.56.56 0 0 1-.56-.56Zm-4.69 2.81c0-.31.25-.56.56-.56h6.38c.31 0 .56.25.56.56s-.25.56-.56.56H8.8a.56.56 0 0 1-.55-.56Z';

function renderIconAsset(asset: IconAsset, className: string): ReactNode {
  if (asset.type === 'simple') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={asset.icon.path} />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox={asset.viewBox} fill="currentColor" aria-hidden="true">
      <path d={asset.path} />
    </svg>
  );
}

function renderBadge(badge: IconBadge): ReactNode {
  if (badge.type === 'simple') {
    const style = {
      '--node-icon-badge-bg': badge.bg,
      '--node-icon-badge-fg': badge.fg,
    } as CSSProperties;

    return (
      <span className="workspace-node-icon__badge" style={style}>
        <svg className="workspace-node-icon__badge-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d={badge.icon.path} />
        </svg>
      </span>
    );
  }

  const style = {
    '--node-icon-badge-bg': badge.bg,
    '--node-icon-badge-fg': badge.fg,
  } as CSSProperties;

  return (
    <span className="workspace-node-icon__badge workspace-node-icon__badge--text" style={style}>
      {badge.label}
    </span>
  );
}

function getIconSpec(node: WorkspaceNode): IconSpec {
  switch (node.icon) {
    case 'github':
      return {
        asset: { type: 'simple', icon: siGithub },
        bg: '#f8fafc',
        fg: '#181717',
      };
    case 'chatgpt':
      return {
        asset: {
          type: 'path',
          viewBox: '146 227 268 265',
          path: OPENAI_BLOSSOM_PATH,
        },
        bg: '#f8fafc',
        fg: '#111827',
      };
    case 'codex':
      return {
        asset: {
          type: 'path',
          viewBox: '146 227 268 265',
          path: OPENAI_BLOSSOM_PATH,
        },
        bg: '#e2e8f0',
        fg: '#111827',
        badge: {
          type: 'text',
          label: '>_',
          bg: '#111827',
          fg: '#f8fafc',
        },
      };
    case 'docker-ubuntu':
      return {
        asset: { type: 'simple', icon: siDocker },
        bg: '#f8fafc',
        fg: '#2496ed',
        badge: {
          type: 'simple',
          icon: siUbuntu,
          bg: '#fff7ed',
          fg: '#e95420',
        },
      };
    case 'review':
      return {
        asset: {
          type: 'path',
          viewBox: '0 0 24 24',
          path: REVIEW_ICON_PATH,
        },
        bg: '#e2e8f0',
        fg: '#334155',
      };
    case 'finder':
      return {
        asset: {
          type: 'path',
          viewBox: '0 0 24 24',
          path: FINDER_ICON_PATH,
        },
        bg: '#e0f2fe',
        fg: '#0369a1',
      };
    default:
      return {
        asset: {
          type: 'path',
          viewBox: '0 0 24 24',
          path: REVIEW_ICON_PATH,
        },
        bg: '#e2e8f0',
        fg: '#334155',
      };
  }
}

export function WorkspaceNodeIcon({
  node,
  variant,
  className,
}: {
  node: WorkspaceNode;
  variant: IconVariant;
  className?: string;
}): ReactNode {
  const spec = getIconSpec(node);
  const style = {
    '--node-icon-bg': spec.bg,
    '--node-icon-fg': spec.fg,
  } as CSSProperties;

  return (
    <span
      className={['workspace-node-icon', `workspace-node-icon--${variant}`, className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    >
      {renderIconAsset(spec.asset, 'workspace-node-icon__svg')}
      {variant === 'dock' && spec.badge ? renderBadge(spec.badge) : null}
    </span>
  );
}
