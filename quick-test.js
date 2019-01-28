import { runSaga, stdChannel } from 'redux-saga';
import { call, take, put, fork, delay, cancelled } from 'redux-saga/effects';

import { createTaskManager } from './src';

global.performance = Date;

const channel = stdChannel();

const manager = createTaskManager('MY_MANAGER', {
  name: 'MyManager',
  log: false,
});

let i = 0;

function* run(...args) {
  console.log('Run Starts: ', args);
  try {
    while (true) {
      console.log('Waiting TEST ', args);
      const action = yield take('TEST');
      console.log('Action Received! ', args, action);
    }
  } finally {
    console.log('Finally!');
    if (yield cancelled()) {
      console.log('CANCELLED! ', args);
      yield delay(1000);
      console.log('After Cancel Delay');
    }
  }
}

function* taskRunner() {
  console.log('\n-- create next --\n');
  yield call(manager.create, 'one', 'two', run, 1, 2, 3);
  console.log('\n-- done create --\n');
  yield delay(1000);
  console.log('\n-- create next --\n');
  yield call(manager.create, 'one', 'two', run, 4, 5, 6);
  console.log('\n-- done create --\n');
}

function* testSaga() {
  yield fork(taskRunner);

  console.log('running checks');

  while (true) {
    i += 1;
    const action = { type: 'TEST', i };
    console.log('DISPATCHING: ', action);
    yield put(action);
    console.log('Delay');
    yield delay(3000);
    console.log('Next');
  }
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
