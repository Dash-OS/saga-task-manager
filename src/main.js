import { cancel, fork, spawn, call } from 'redux-saga/effects';
import { TASK } from 'redux-saga/utils';
import { CANCEL } from 'redux-saga';

import printLog from './utils/logger';
import handleTaskCleanup from './sagas/handleTaskCleanup';
import onKillWatcher from './sagas/onKillWatcher';

const TaskManagers = new Map();

const CreateSagaPromise = (Prom, handler, oncancel) => {
  const SagaPromise = new Prom(handler);
  SagaPromise[CANCEL] = oncancel;
  return SagaPromise;
};

const buildConfig = config => ({
  name: 'SagaTaskMan',
  // should we cancel tasks if we schedule new tasks with same category, id?
  // if this is false then an error will be reported unless silent is true
  // at which point nothing will happen unless the task is cancelled first.
  overwrite: true,
  // do we want to supress errors and fail silently?
  silent: false,
  // do we want to log internal functions?
  log: false,
  logCollapsed: true,
  icon: '📟',
  ...config,
});

class SagaTaskMan {
  constructor(id, config) {
    this.id = id;
    this.config = buildConfig(config);
    if (!this.config.name) {
      this.config.name = id;
    }
    this.tasks = new Map();
    this.handlers = {
      promises: new Map(),
      resolvers: new Map(),
    };

    if (this.config.log) {
      this.logger = this.config.logCollapsed
        ? console.groupCollapsed
        : console.group;
      this.handleLog = printLog.bind(this);
      this.handleLog('info', 'Task Manager Constructed', this.config);
    } else {
      this.handleLog = () => {};
    }

    this.create = this.create.bind(this);
    this.createHandler('onKilled');
  }

  getName = () => this.config.name;

  *create(category, id, fn, ...args) {
    this.handleLog('info', 'Create Task', category, id);
    if (!category || !id || !fn) {
      return this.handleError(
        `Tasks must have a category, id, and fn at a minimum but received ${category}.${id} - ${fn}`,
        'critical',
      );
    }
    try {
      if (this.config.overwrite) {
        yield call([this, this.cancel], category, id);
      } else if (yield call([this, this.taskExists], category, id)) {
        return this.handleError(
          `When overwrite config is set to false, you must cancel tasks before scheduling them again.  While Creating Task: ${category}.${id}`,
        );
      }

      const task = yield spawn([this, this.run], [category, id], fn, ...args);
      this.saveTask(category, id, task, args);

      yield spawn([this, this.onTaskComplete], category, id, [
        this,
        handleTaskCleanup,
      ]);

      if (!this.killWatcher) {
        this.killWatcher = yield spawn([this, onKillWatcher]);
      }
    } catch (e) {
      this.handleError(
        `Failed to create task: (${category}.${id}): ${e.message}`,
      );
      throw e;
    }
  }

  /*
    Before calling the task we spawn here so that we can catch any errors
    that may occur during the execution of the task.
  */
  *run(task, fn, ...args) {
    try {
      yield call(fn, ...args);
    } catch (e) {
      /* When an error occurs at this level we do not throw it further.  We do this because
         since we are the root level of a spawn, throwing further will not propagate to any
         handlers that have been created anyway.  Instead we will report the error.
      */
      let [category, id] = task;
      if (typeof category === 'symbol') {
        category = category.toString();
      }
      if (typeof id === 'symbol') {
        id = id.toString();
      }
      this.handleError(
        `uncaught while running task ${category}.${id}: ${e.message}`,
        'critical',
        e,
        false,
      );
    }
  }

  *onTaskComplete(category, id, fn) {
    const task = this.getTask(category, id);
    if (!fn) {
      return null;
    }
    if (!task || !task[TASK] || task.done === undefined) {
      return this.handleError(`Task Does Not Exist: ${category}.${id}`);
    }
    try {
      yield task.done;
    } finally {
      this.handleLog('info', 'Task Complete!', category, id);
      yield call(fn, category, id);
    }
  }

  handleCancelled = handler => this.removeHandler(handler);

  *cancel(category, id) {
    if (!id) {
      return yield call([this, this.cancelCategory], category);
    }
    const categoryTasks = this.getCategory(category);
    if (!categoryTasks) {
      return;
    }
    return yield call([this, this.cancelTask], categoryTasks, category, id);
  }

  *cancelCategory(category) {
    const categoryTasks = this.getCategory(category);
    const tasks = [];
    for (const [id, task] of categoryTasks) {
      tasks.push(
        yield fork([this, this.cancelTask], categoryTasks, category, id, task),
      );
    }
    return tasks;
  }

  *cancelAll() {
    const tasks = [];
    for (const [category] of this.tasks) {
      tasks.push(yield fork([this, this.cancelCategory], category));
    }
    return tasks;
  }

  *cancelTask(tasks, category, id, task) {
    // console.warn('CANCEL TASK: ', category, id, task)
    if (!task && !tasks.has(id)) {
      return;
    }
    task = task || tasks.get(id);
    if (task && task[TASK] && task.isRunning()) {
      yield cancel(task);
    }
    tasks.delete(id);
    if (tasks.size === 0) {
      this.tasks.delete(category);
    }
    return task;
  }

  taskExists(category, id) {
    if (this.getTask(category, id)) {
      return true;
    }
    return false;
  }

  awaitHandler = handler => this.handlers.promises.get(handler);

  getCategory = (category, createIfNeeded = false) => {
    let categoryTasks;
    if (this.tasks.has(category)) {
      categoryTasks = this.tasks.get(category);
    } else if (createIfNeeded) {
      categoryTasks = this.createCategory(category);
    }
    return categoryTasks;
  };

  createCategory = category => {
    let categoryTasks;
    if (this.tasks.has(category)) {
      categoryTasks = this.tasks.get(category);
    } else {
      this.createHandler(`onCategory.${category}`);
      categoryTasks = new Map();
      this.tasks.set(category, categoryTasks);
    }
    return categoryTasks;
  };

  getTask = (category, id) => {
    const categoryTasks = this.getCategory(category);
    if (categoryTasks) {
      return categoryTasks.get(id);
    }
  };

  getAllTasks = () => this.tasks;

  saveTask = (category, id, task) => {
    const categoryTasks = this.getCategory(category, true);
    if (categoryTasks.has(id)) {
      this.handleError(
        `Failed to Save Task, ${category}.${id} already exists`,
        'critical',
      );
    } else {
      categoryTasks.set(id, task);
    }
  };

  handleCategoryComplete = category => {
    const handler = this.handlers.resolvers.get(`onCategory.${category}`);
    if (!handler) {
      this.handleLog(
        'warn',
        `Tried to cancel ${category} but it was not found in resolvers!`,
      );
    } else {
      handler.resolve();
    }
  };

  handleError = (msg, level = 'error', e, shouldThrow = true) => {
    this.handleLog('error', msg, e);
    if (shouldThrow) {
      if (this.config.silent === true && level !== 'critical') {
        return;
      }
      if (this.config.silent === 'critical') {
        return;
      }
      throw new Error(`[${this.getName()}] ${msg}`);
    } else if (level === 'critical') {
      return console.error(msg);
    }
  };

  createHandler = (handler, ...args) =>
    this.handlers.promises.set(
      handler,
      CreateSagaPromise(
        Promise,
        (resolve, reject) =>
          this.handlers.resolvers.set(handler, { resolve, reject }),
        () => this.handleCancelled(handler, ...args),
      )
        .then(r => {
          this.removeHandler(handler);
          return r;
        })
        .catch(err => {
          this.removeHandler(handler);
          throw err;
        }),
    );

  removeHandler = handler => {
    this.handlers.resolvers.delete(handler);
    this.handlers.promises.delete(handler);
  };

  kill = () => {
    if (this.killed) {
      this.handleLog(
        'warn',
        'Process is already killed but you called kill on it again!',
      );
      return;
    }
    this.killed = true;

    const killPromise = this.handlers.promises
      .get('onKilled')
      .then(r => {
        if (!this.deleted) {
          TaskManagers.delete(this.id);
        }
        return r;
      })
      .catch(err => {
        this.handleError(
          `Failed to Kill Task Manager: ${err.message}`,
          'critical',
        );
        if (!this.deleted) {
          TaskManagers.delete(this.id);
        }
        return err;
      });

    this.handlers.resolvers.get('onKilled').resolve();

    return killPromise;
  };
}

function createTaskManager(id, config) {
  if (TaskManagers.has(id)) {
    const oldManager = TaskManagers.get(id);
    if (!oldManager.killed) {
      oldManager.kill();
    }
  }
  const taskman = new SagaTaskMan(id, config);
  TaskManagers.set(id, taskman);
  return taskman;
}

function killAllTaskManagers(reversed = true) {
  let managers = [...TaskManagers];
  // kill newest to oldest if reversed (default)
  if (reversed) {
    managers = managers.reverse();
  }
  const killPromises = [];
  for (const [managerID, manager] of managers) {
    const killPromise = manager.kill();
    // manually mark deleted so no conflicts exists
    // while the kill resolves asynchronously.
    TaskManagers.delete(managerID);
    manager.deleted = true;
    killPromises.push(killPromise);
  }
  return killPromises.length > 0 && Promise.all(killPromises);
}

export { createTaskManager, TaskManagers, killAllTaskManagers };
