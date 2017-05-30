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
import { cancelled, call } from 'redux-saga/effects'

import SagaTaskMan from 'saga-task-manager'

const Task = new SagaTaskMan({
  /* optional configuration */
  // name for logs and event reporting
  name: 'SagaTaskMan'
  // log internal events?
  log: false,
  // collapse logs by default? (default true)
  logCollapsed: true,
  // supress throwing errors? true || 'critical'
  // 'crtical' will supress errors that break functionality
  silent: false,
  // overwrite will cancel tasks that are running if a new task is 
  // created with the same category and id. 
  overwrite: true
})

function* myTask(foo) {
  try {
    /* run your task */
  } catch (e) {
    /* handle error */
  } finally {
    if ( yield cancelled() ) {
      /* handle cancellation */ 
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
  yield call([ Task, Task.create ], 'myCategory', 'myTaskID', myTask, 1)
  yield call([ Task, Task.create ], 'myCategory', 'myTaskID', myTask, 2)
  // Task creation returns a task if one is created successfully
  const task = yield call([ Task, Task.create ], 'myCategory', 'myTaskID', myTask, 3)
  
  
  
  /*  Task Cancellation:
      If we want to cancel a task we can do so using the category/id or we can
      cancel an entire category of tasks by just providing the category
  */
  // cancel the entire "myCategory" category
  yield call([ Task, Task.cancel ], 'myCategory')
  // cancel the task only
  yield call([ Task, Task.cancel ], 'myCategory', 'myTaskID')
  
}

```