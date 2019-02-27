import { cancel, fork, call } from 'redux-saga/effects';

import { handleLog, handleError } from './logger';

import createDispatcher from './dispatcher';

import createTask from './sagas/createTask';

import {
  categoryExists,
  taskExists,
  getAllSagaTasksFromCategory,
  getSagaTaskFromCategory,
} from './utils';

import { TaskManagers } from './context';

function NOOP() {}

const buildConfig = config => ({
  name: 'SagaTaskMan',
  // should we cancel tasks if we schedule new tasks with same category, id?
  // if this is false then an error will be reported unless silent is true
  // at which point nothing will happen unless the task is cancelled first.
  overwrite: true,
  // do we want to supress errors and fail silently?
  silent: false,
  // do we want to log internal events and information?
  log: false,
  logCollapsed: true,
  icon: '📟',
  ...config,
});

function SagaTaskManager(managerID, _config) {
  const config = buildConfig(_config);

  const state = {
    config,
    isActive: true,
    log: NOOP,
    logger: config.logCollapsed ? console.groupCollapsed : console.group,
    tasks: new Map(),
    // will be created once we build manager
    dispatcher: undefined,
  };

  state.dispatcher = createDispatcher(state);

  state.log = handleLog.bind(state);

  if (config.log) {
    state.log('info', 'Task Manager Constructed', config);
  }

  const manager = Object.freeze({
    id: managerID,
    config,

    get active() {
      return state.isActive;
    },

    kill: () => {
      state.isActive = false;
      TaskManagers.delete(managerID);
      const promise = state.dispatcher.subscribe('onAllComplete');
      state.tasks.forEach(([, tasks]) => {
        tasks.forEach(task => task.cancel());
      });

      return promise;
    },

    /**
     * Cancel a task by a category (all category tasks) or a category and id.
     */
    *cancel(categoryID, id) {
      if (!id) {
        const result = yield call(manager.killCategory, categoryID);
        return result;
      }
      const result = yield call(manager.cancelTask, categoryID, id);
      return result;
    },

    /**
     * Cancels a category or task explicitly rather than based on args
     * like `manager.cancel`. Avoids the potential side effect if `id`
     * was unknowingly `undefined` by accident when using the
     * `cancelCategory` / `cancelTask` functions.
     */
    *cancelCategory(categoryID) {
      const tasks = getAllSagaTasksFromCategory(state, categoryID);
      if (!tasks) return;
      const result = yield cancel(tasks);
      return result;
    },
    *cancelTask(categoryID, taskID) {
      const task = getSagaTaskFromCategory(state, categoryID, taskID);
      if (!task || !task.isRunning()) return;
      const result = yield cancel(task);
      return result;
    },

    /**
     * Cancels all tasks the manager handles.
     */
    *cancelAll() {
      const result = yield [...state.tasks].map(([category]) =>
        fork(function* handleForkedCancelCategory() {
          try {
            yield call(manager.cancelCategory, category);
          } catch (err) {
            handleError(
              manager,
              state,
              `Received an error while canceling a category "${category}" from manager.cancelAll`,
              'critical',
              err,
            );
          }
        }),
      );
      return result;
    },

    *create(categoryID, taskID, fn, ...args) {
      if (!state.isActive) {
        throw new Error(
          `[ERROR] | [saga-task-manager] | Task Manager ${managerID} is no longer active and can not create task "${
            categoryID ? categoryID.toString() : 'undefined'
          }.${taskID ? taskID.toString() : 'undefined'}"`,
        );
      }
      const context = { categoryID, taskID, fn, args };

      if (!categoryID || !taskID || typeof fn !== 'function') {
        return handleError(
          manager,
          state,
          `Tasks must have a category, id, and fn at a minimum but received ${
            categoryID ? categoryID.toString() : 'undefined'
          }.${taskID ? taskID.toString() : 'undefined'} - ${fn}`,
          'critical',
        );
      }

      const result = yield call(createTask, manager, state, context);
      return result;
    },

    /**
     * Subscribe to a given event based on parameters.  This will return an
     * event channel that may then be awaited upon.
     */
    subscribe: (...args) => state.dispatcher.subscribe(...args),

    getTask: (categoryID, taskID) =>
      getSagaTaskFromCategory(state, categoryID, taskID),

    categoryExists: categoryID => categoryExists(state, categoryID),

    taskExists: (categoryID, taskID) => taskExists(state, categoryID, taskID),
  });

  return manager;
}

function createTaskManager(managerID, config) {
  const oldManager = TaskManagers.get(managerID);
  if (oldManager && oldManager.active) oldManager.kill();
  const manager = SagaTaskManager(managerID, config);
  TaskManagers.set(managerID, manager);
  return manager;
}

function killAllTaskManagers(reversed = true) {
  if (TaskManagers.size === 0) return;
  let managers = [...TaskManagers];
  // kill newest to oldest if reversed (default)
  if (reversed) managers = managers.reverse();
  return Promise.all(managers.map(([, manager]) => manager.kill()));
}

export { createTaskManager, TaskManagers, killAllTaskManagers };
