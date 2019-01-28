import { spawn, call } from 'redux-saga/effects';
import { SAGA_TASK_MANAGER } from '../constants';

import { handleError } from '../logger';

import { saveTaskToState, taskExists } from '../utils';

import runTask from './runTask';
import watchTask from './watchTask';

function* awaitCancellationComplete(manager, state, categoryID, taskID) {
  const waitTaskCancelled = state.dispatcher.subscribe(
    'onTaskComplete',
    categoryID,
    taskID,
  );
  yield call(manager.cancelTask, categoryID, taskID);
  yield call(() => waitTaskCancelled);
}

export default function* createTask(manager, state, context) {
  const { config } = manager;
  const { categoryID, taskID } = context;

  try {
    if (taskExists(state, categoryID, taskID)) {
      if (!config.overwrite) {
        return handleError(
          manager,
          state,
          `When overwrite config is set to false, you must cancel tasks before scheduling them again.  While Creating Task: ${categoryID.toString()}.${taskID.toString()}`,
        );
      }
      yield call(awaitCancellationComplete, manager, state, categoryID, taskID);
    }

    const [task, ready] = yield call(runTask, manager, state, context);

    yield call([task, task.setContext], { [SAGA_TASK_MANAGER]: context });

    saveTaskToState(manager, state, context, task);

    if (config.log) {
      // eslint-disable-next-line no-param-reassign
      context.created = performance.now();
      state.log(
        'info',
        `Task Created: ${categoryID.toString()}.${taskID.toString()}`,
        ['%c Category: ', 'font-weight: bold;', categoryID.toString()],
        ['%c ID: ', 'font-weight: bold;', taskID.toString()],
      );
    }

    yield spawn(watchTask, manager, state, context, task, ready);
  } catch (err) {
    handleError(
      manager,
      state,
      `Failed to create task "${categoryID.toString()}.${taskID.toString()}": ${
        err.message
      }`,
    );
  }
}
