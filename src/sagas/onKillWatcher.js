import { call } from 'redux-saga/effects'

export default function* onKillWatcher() {
  this.handleLog('info', 'Starting Kill Watcher')
  yield call(() => this.awaitHandler('onKilled'))
  this.handleLog('warn', 'KILLED!', this)
  yield* this.cancelAll()
}
