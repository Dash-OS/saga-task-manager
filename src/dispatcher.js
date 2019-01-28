import { DEFERRED_PROMISE } from './constants';

import { hasProp, deferredPromise, categoryExists, taskExists } from './utils';

class TaskEventMap extends Map {}
class CategoryEventMap extends Map {}

const EVENTS = {
  onManagerKilled: () => deferredPromise(),

  /* When subscribed, we will begin monitoring the 
     size of each of the subscriptions and will dispatch
     to this event once they have all been emptied. */
  onAllComplete: () => deferredPromise(),

  onTaskComplete: () => new TaskEventMap(),

  onCategoryComplete: () => new CategoryEventMap(),
};

function validateEvent(event) {
  if (!hasProp(EVENTS, event)) {
    throw new Error(
      `[ERROR] | [saga-task-manager] | subscribe | event "${event}" is not a valid event and can not be subscribed to.  Valid events are "${Object.keys(
        EVENTS,
      ).join(', ')}"`,
    );
  }
}

/**
 * Internal Event Dispatch utilizing redux-saga's channel mechanisms
 */
export default function createDispatcher(state) {
  const subscriptions = {};

  function handleEventComplete(event, categoryID) {
    switch (event) {
      // all tasks are completed for a category
      case 'onTaskComplete': {
        if (subscriptions.onCategoryComplete) {
          const categoryDescriptor = subscriptions.onCategoryComplete.get(
            categoryID,
          );
          if (categoryDescriptor) {
            subscriptions.onCategoryComplete.delete(categoryID);
            if (subscriptions.onCategoryComplete.size === 0) {
              delete subscriptions.onCategoryComplete;
            }
            Promise.resolve().then(() => categoryDescriptor.resolve());
          }
        }
        break;
      }
      case 'onCategoryComplete': {
        // categories are completed, just check onAllComplete if needed
        break;
      }
      default:
        break;
    }
    if (subscriptions.onAllComplete) {
      /* Run a check and schedule a call to onAllComplete if needed */
      if (!subscriptions.onTaskComplete && !subscriptions.onCategoryComplete) {
        const descriptor = subscriptions.onAllComplete;
        delete subscriptions.onAllComplete;
        Promise.resolve().then(() => descriptor.resolve());
      }
    }
  }

  function getEventDescriptor(event, categoryID, taskID) {
    const eventMap = subscriptions[event];

    if (!eventMap) return;

    if (eventMap[DEFERRED_PROMISE]) {
      delete subscriptions[event];
      // handleEventComplete(event);
      return eventMap;
    }

    const isCategoryMap = eventMap instanceof CategoryEventMap;

    let descriptor;

    if (isCategoryMap) {
      if (!categoryID) return;
      descriptor = eventMap.get(categoryID);
      eventMap.delete(categoryID);
    } else {
      if (!categoryID || !taskID) return;
      const taskMap = eventMap.get(categoryID);
      if (!taskMap) return;
      descriptor = taskMap.get(taskID);
      taskMap.delete(taskID);
      if (taskMap.size === 0) eventMap.delete(categoryID);
    }

    if (eventMap.size === 0) {
      delete subscriptions[event];
      if (descriptor) handleEventComplete(event, categoryID);
    }

    return descriptor;
  }

  function createEventDescriptor(event, categoryID, taskID) {
    validateEvent(event);

    const eventMap = subscriptions[event]
      ? subscriptions[event]
      : EVENTS[event]();

    subscriptions[event] = eventMap;

    if (eventMap[DEFERRED_PROMISE]) return eventMap;

    const isCategoryMap = eventMap instanceof CategoryEventMap;

    let descriptor;

    if (isCategoryMap) {
      if (!categoryID) {
        throw new Error(
          `[ERROR] | [saga-task-manager] | dispatcher.createEventDescriptor | Failed to create descriptor for event "${event}" as it expects a categoryID but received undefined`,
        );
      } else if (!categoryExists(state, categoryID)) {
        throw new Error(
          `[ERROR] | [saga-task-manager] | dispatcher.createEventDescriptor | Failed to create descriptor for event "${event}" for category "${categoryID.toString()}" as the category does not exist.`,
        );
      }
      descriptor = eventMap.get(categoryID);
      if (!descriptor) {
        descriptor = deferredPromise();
        eventMap.set(categoryID, descriptor);
      }
    } else {
      if (!categoryID || !taskID) {
        throw new Error(
          `[ERROR] | [saga-task-manager] | dispatcher.createEventDescriptor | Failed to create descriptor for event "${event}" as it expects a categoryID and taskID but received undefined "${
            categoryID ? categoryID.toString() : 'undefined'
          }.${taskID ? taskID.toString() : 'undefined'}"`,
        );
      } else if (!taskExists(state, categoryID, taskID)) {
        throw new Error(
          `[ERROR] | [saga-task-manager] | dispatcher.createEventDescriptor | Failed to create descriptor for event "${event}" on "${categoryID.toString()}.${taskID.toString()}" as the task does not exist.`,
        );
      }
      let taskMap = eventMap.get(categoryID);
      if (!taskMap) {
        taskMap = new Map();
        eventMap.set(categoryID, taskMap);
      } else {
        descriptor = taskMap.get(taskID);
      }
      if (!descriptor) {
        descriptor = deferredPromise();
        taskMap.set(taskID, descriptor);
      }
    }

    if (!descriptor) {
      throw new Error(
        `[ERROR] | [saga-task-manager] | dispatcher.createEventDescriptor | Failed to create descriptor for event "${event}"`,
      );
    }

    return descriptor;
  }

  const dispatcher = {
    emit(event, payload, categoryID, taskID) {
      const descriptor = getEventDescriptor(event, categoryID, taskID);
      if (!descriptor || !descriptor.resolve) return;
      return descriptor.resolve(payload);
    },

    throw(event, err, categoryID, taskID) {
      const descriptor = getEventDescriptor(event, categoryID, taskID);
      if (!descriptor || !descriptor.reject) return;
      return descriptor.reject(err);
    },

    subscribe: (...args) => createEventDescriptor(...args).promise,
  };

  return dispatcher;
}
