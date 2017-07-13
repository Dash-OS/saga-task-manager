import { call } from 'redux-saga/effects';

export default function* onKillWatcher() {
  if (this.config.log === 'debug') {
    this.handleLog('info', 'Starting Kill Watcher');
  }
  yield call(() => this.awaitHandler('onKilled'));
  this.handleLog('warn', 'TASK MANAGER KILLED');
  yield call([this, this.cancelAll]);
}
