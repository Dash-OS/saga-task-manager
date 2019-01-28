import { all, call } from 'redux-saga/effects';

import { removeTaskFromState } from '../utils';

function handleLogTaskResult(state, context, task) {
  const categoryID = context.categoryID.toString();
  const taskID = context.taskID.toString();

  const result = task.result();

  let elapsed = context.created
    ? performance.now() - context.created
    : '[not measured]';

  if (elapsed > 60000) elapsed = Math.round(elapsed);

  const logs = [
    ['%c Duration (MS): ', 'font-weight: bold; color: darkgreen;', elapsed],
  ];

  if (result === undefined) {
    logs.push([
      '%c Result: ',
      'font-weight: bold; color: darkgreen;',
      'undefined',
    ]);
  } else if (result instanceof Error) {
    logs.push(
      ['%c Result: ', 'font-weight: bold; color: red;', result.message],
      result,
    );
  } else {
    logs.push(['%c Result: ', 'font-weight: bold; color: darkgreen;', result]);
  }
  state.log(
    'info',
    `Task Complete: ${categoryID}.${taskID}`,
    ['%c Category: ', 'font-weight: bold;', categoryID],
    ['%c ID: ', 'font-weight: bold;', taskID],
    ...logs,
  );
}

export default function* watchTask(manager, state, context, task, ready) {
  try {
    yield all([
      call(
        state.dispatcher.subscribe,
        'onTaskComplete',
        context.categoryID,
        context.taskID,
      ),
      call(ready),
    ]);
  } finally {
    removeTaskFromState(state, context, task);
    if (manager.config.log) handleLogTaskResult(state, context, task);
  }
}
