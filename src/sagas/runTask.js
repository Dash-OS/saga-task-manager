import { cancelled, spawn, call } from 'redux-saga/effects';
import { deferredPromise } from '../utils';

import { handleError } from '../logger';

function* sagaTaskRunner(manager, state, context, waitUntilReady) {
  const { categoryID, taskID, fn, args = [] } = context;
  let result;
  try {
    yield call(() => waitUntilReady);
    result = yield call(fn, ...args);
  } catch (err) {
    /* When an error occurs at this level we do not throw it further.  We do this because
       since we are the root level of a spawn, throwing further will not propagate to any
       handlers that have been created anyway.  Instead we will report the error.
    */
    handleError(
      manager,
      state,
      `uncaught error while running task ${categoryID.toString()}.${taskID.toString()}`,
      'critical',
      err,
      false,
    );
    result = err;
  } finally {
    if (yield cancelled()) {
      state.dispatcher.emit('onTaskCancelled', context, categoryID, taskID);
    }
    // eslint-disable-next-line no-param-reassign
    context.result = result;
    state.dispatcher.emit('onTaskComplete', context, categoryID, taskID);
  }
  return result;
}

export default function* runTask(manager, state, context) {
  const { promise, resolve } = deferredPromise();

  const task = yield spawn(sagaTaskRunner, manager, state, context, promise);

  return [task, resolve];
}
