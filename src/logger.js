export function handleLog(level, ...args) {
  if (
    level === 'warn' ||
    level === 'error' ||
    level === 'info' ||
    level === 'log'
  ) {
    this.logger(
      `${this.config.icon || ''} [saga-task-manager] | ${
        this.config.name
      } | ${level.toUpperCase()} | ${args[0]}`,
    );
    args.slice(1).forEach(entry => {
      if (Array.isArray(entry)) {
        console[level](...entry);
      } else {
        console[level](entry);
      }
    });
  } else {
    this.logger(
      `${this.config.icon || ''} [saga-task-manager] | ${
        this.config.name
      } | ${level}`,
    );
    args.forEach(entry => {
      if (Array.isArray(entry)) {
        console.info(...entry);
      } else {
        console.info(entry);
      }
    });
  }

  let totalTasks = 0;

  console.groupCollapsed(`Active Categories: ${this.tasks.size}`);
  this.tasks.forEach((tasks, categoryID) => {
    console.group(`${categoryID.toString()} | Running Tasks: ${tasks.size}`);
    totalTasks += tasks.size;
    console.info([].concat([...tasks.keys()]));
    console.groupEnd();
  });

  console.groupEnd();
  if (totalTasks) console.log('Total Running Tasks: ', totalTasks);

  console.groupEnd();
}

export function handleError(
  { config },
  { log },
  msg,
  level = 'error',
  e,
  shouldThrow = true,
) {
  log('error', msg, e);
  if (shouldThrow) {
    if (
      config.silent === true &&
      (config.silent === 'critical' || level !== 'critical')
    ) {
      return;
    }
    throw new Error(`[saga-task-manager] | [${config.name}] | ${msg}`);
  } else if (level === 'critical') {
    console.error(msg);
  }
}
