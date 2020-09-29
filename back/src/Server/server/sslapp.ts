import { SSLApp as _SSLApp, AppOptions } from 'uWebSockets.js';
import BaseApp from './baseapp';
import { extend } from './utils';
import { UwsApp } from './types';

class SSLApp extends (<UwsApp>_SSLApp) {
  constructor(options: AppOptions) {
    super(options); // eslint-disable-line constructor-super
    extend(this, new BaseApp());
  }
}

export default SSLApp;
