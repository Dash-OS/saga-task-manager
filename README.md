# saga-task-manager

A Task Manager to make working with `redux-saga` tasks easier to work with.  

### Features / Summary

 - Tasks are created by category and id.  
 - Tasks can be cancelled by category or id.  Cancelling a category will cancel all tasks that are apart of the given category.
 - Scheduling a task which has already been scheduled will either
 cancel the previous task or throw an error (depending on your configuration).
 - Powerful logging capabilities help provide information about each
 task, it's lifecycle, and what is really going on with your sagas.
 - Easily kill all tasks across all created managers.  Essential for hot reloading of your sagas reliably.
 - Powerful introspection / debugging capabilities.
 - Tasks always run in their own context, detached (spawned) from
 the caller.  Cancelling the creator of the task will not affect the
 task itself unless cancelled in the sagas cancellation handler.

### Installation

```
yarn add saga-task-manager
```

**or**

```
npm install --save saga-task-manager
```

### Logging

One helpful tool provided is the introspection of your tasks via the
logging and introspection mechanisms.  This helps make sure that your
sagas are performing as expected and helps track down runaway sagas.

When a given task completes, it will print the duration and result of
the task to aid in performance enhancements and debugging.

![](https://user-images.githubusercontent.com/15365418/28110828-62c05d0a-66a8-11e7-8526-ccfeda990f47.png)

> **Note:** When logging is not enabled, the function that handles the
> logging is removed completely. Logging itself can have a performance
> impact and for obvious reasons should only be enabled in development.

### Simple Example

```js
import { delay } from 'redux-saga';
import { cancelled, call } from 'redux-saga/effects';

import SagaTaskMan from 'saga-task-manager';

const tasks = createTaskManager('MY_TASK_MANAGER', {
  // log internal events? this will provide a summary
  // of running tasks and inform you of various events.
  // (default false)
  log: true,
  // collapse logs by default? (default true)
  logCollapsed: true,
  // supress throwing errors? true || 'critical'
  // 'crtical' will supress errors that break functionality
  silent: false,
  // icons are definitely useful if you have many task managers setup.
  icon: '❇️',
  // overwrite will cancel tasks that are running if a new task is
  // created with the same category and id.
  overwrite: true,
});

function* myTask(n) {
  try {
    /* run your task */
    yield call(delay, 1000);
    console.log(n);
  } catch (e) {
    /* handle error */
  } finally {
    if (yield cancelled()) {
      /* handle cancellation */
      console.log('Cancelled: ', n);
    }
  }
}

function* mySaga() {

  /*  Task Creation:
      every time we create the task, any previous will be cancelled
      before the next one is run.  In the example below, the task will
      be called and cancelled and the final task will be the only task
      left running.
  */

  yield call([tasks, tasks.create], 'myCategory', 'myTaskID', myTask, 1);

  yield call([tasks, tasks.create], 'myCategory', 'myTaskID', myTask, 2);

  // Task creation returns a task if one is created successfully
  const task = yield call(
    [tasks, tasks.create],
    'myCategory',
    'myTaskID',
    myTask,
    3,
  );

  /*  Task Cancellation:
      If we want to cancel a task we can do so using the category/id or we can cancel an entire category of tasks by just providing the category
  */

  // cancel the entire "myCategory" category
  yield call([tasks, tasks.cancel], 'myCategory');

  // cancel the task only
  yield call([tasks, tasks.cancel], 'myCategory', 'myTaskID');
}


```

### Kill All

SagaTaskManager uses redux-saga's `spawn` for each task and manages each task internally.  It will monitor the lifecycle of your task and
assist in reporting and logging where necessary.

At times you may want to kill all running tasks across your application.  For example, during a hot reload.  

```js
import { killAllTaskManagers } from 'saga-task-manager'

killAllTaskManagers()
```

### Introspection

It can be helpful to know all your currently running tasks.  You can
get all current task managers by simply importing the map.  This should
only be used for introspection.

```js
import { TaskManagers } from 'saga-task-manager'

for (const [managerID, tasks] of TaskManagers) {
  // play with the managers
}
```
