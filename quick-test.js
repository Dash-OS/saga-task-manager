import { runSaga, stdChannel } from 'redux-saga';
import { call, take, put, fork, delay, cancelled } from 'redux-saga/effects';

import { createTaskManager } from './src';

global.performance = Date;

const channel = stdChannel();

const manager = createTaskManager('MY_MANAGER', {
  name: 'MyManager',
  log: true,
});

const i = 0;

function* run(...args) {
  console.log('Run Starts: ', args);
}

function* taskRunner() {
  console.log('\n-- create next --\n');
  yield call(manager.create, 'one', 'two', run, 1, 2, 3);
  console.log('\n-- done create --\n');
}

function* testSaga() {
  yield fork(taskRunner);
}

function start() {
  runSaga(
    {
      channel,
      dispatch: action => {
        channel.put(action);
      },
      getState: () => ({ value: 'test' }),
    },
    testSaga,
    1,
  );
}

start();
