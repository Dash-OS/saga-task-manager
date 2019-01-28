import { DEFERRED_PROMISE } from './constants';

import { handleError } from './logger';

export function hasProp(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function deferredPromise() {
  const defer = {
    [DEFERRED_PROMISE]: true,
  };
  defer.promise = new Promise((resolve, reject) => {
    defer.resolve = resolve;
    defer.reject = reject;
  });
  return defer;
}

export function getCategory(state, categoryID) {
  return state.tasks.get(categoryID);
}

export function getTask(state, categoryID, taskID) {
  const category = getCategory(state, categoryID);
  if (category) return category.get(taskID);
}

export function getAllSagaTasksFromCategory(state, categoryID) {
  const category = getCategory(state, categoryID);
  if (!category || category.size === 0) return;
  return [...category.values()];
}

export function getSagaTaskFromCategory(state, categoryID, taskID) {
  const category = getCategory(state, categoryID);
  if (!category || category.size === 0) return;
  return category.get(taskID);
}

/**
 * Checks if a given categoryID exists.
 *
 * @param {TaskManagerState} state
 * @param {string} categoryID - The category to check.
 */
export function categoryExists(state, categoryID) {
  const category = getCategory(state, categoryID);
  if (!category || category.size === 0) return false;
  return true;
}

/**
 * Checks if a given taskID exists.
 *
 * @param {TaskManagerState} state
 * @param {string} categoryID - The category to check.
 * @param {string} taskID - Optionally check for an ID in the category given.
 */
export function taskExists(state, categoryID, taskID) {
  const category = getCategory(state, categoryID);
  if (!category || category.size === 0) return false;
  return category.has(taskID);
}

function createCategory(state, categoryID) {
  const map = new Map();
  state.tasks.set(categoryID, map);
  return map;
}

export function createOrGetCategory(state, categoryID) {
  return getCategory(state, categoryID) || createCategory(state, categoryID);
}

export function saveTaskToState(manager, state, { categoryID, taskID }, task) {
  const category = createOrGetCategory(state, categoryID);

  const prevTask = category.get(taskID);

  if (prevTask && prevTask.isRunning()) {
    // Should never happen, sanity check
    return handleError(
      manager,
      state,
      `Failed to Save Task "${categoryID}.${taskID}" as it already exists`,
      'critical',
    );
  }

  category.set(taskID, task);
}

export function removeTaskFromState(state, { categoryID, taskID }, task) {
  const category = getCategory(state, categoryID);
  if (!category) return;
  const savedTask = category.get(taskID);
  if (savedTask === task) category.delete(taskID);
  if (category.size === 0) state.tasks.delete(categoryID);
}
