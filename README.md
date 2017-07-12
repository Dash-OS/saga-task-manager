# saga-task-manager

A Task Manager to help manage forked tasks from redux-saga.  Tasks have a
"category" and "id" which is used to identify and ensure we don't run more
than one of any given task.  

SagaTaskMan automatically cleans up when tasks have been completed by any means.  
You can cancel, introspect, and register callback to occur when certain events
occur within the task if desired.

> **IMPORTANT** This is not stable at this time.

### Installation

```
yarn add saga-task-manager
```

**or**

```
npm install --save saga-task-manager
```

### Simple Example

```js
import { delay } from 'redux-saga';
import { cancelled, call } from 'redux-saga/effects';

import SagaTaskMan from 'saga-task-manager';

const tasks = createTaskManager('MY_TASK_MANAGER', {
  // log internal events? this will provide a summary
  // of running tasks and inform you of various events.
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
      be callled and cancelled and the final task will be the only task
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
      If we want to cancel a task we can do so using the category/id or we can
      cancel an entire category of tasks by just providing the category
  */

  // cancel the entire "myCategory" category
  yield call([Task, Task.cancel], 'myCategory');

  // cancel the task only
  yield call([Task, Task.cancel], 'myCategory', 'myTaskID');
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
```
