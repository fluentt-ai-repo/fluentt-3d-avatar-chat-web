/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_LIVEKIT_URL: string;
  readonly VITE_ROOM_PREFIX: string;
  readonly VITE_CHAT_MODE?: string;
  readonly VITE_ADK_URL?: string;
  readonly VITE_ADK_APP_NAME?: string;
  readonly VITE_ADK_USER_ID?: string;
  readonly VITE_UNITY_BUILD_NAME?: string;
  readonly VITE_SESSION_API_URL?: string;
  readonly VITE_SESSION_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// SVGR React component imports
declare module '*.svg?react' {
  import * as React from 'react';
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
