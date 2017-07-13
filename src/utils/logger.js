export default function printLog(level, ...args) {
  if (
    level === 'warn' ||
    level === 'error' ||
    level === 'info' ||
    level === 'log'
  ) {
    this.logger(
      `${this.config.icon ||
        ''} [saga-task-manager] | ${this.getName()} | ${level.toUpperCase()} | ${args[0]}`,
    );
    for (const entry of args.slice(1)) {
      if (Array.isArray(entry)) {
        console[level](...entry);
      } else {
        console[level](entry);
      }
    }
  } else {
    this.logger(
      `${this.config.icon ||
        ''} [saga-task-manager] | ${this.getName()} | ${level}`,
    );
    for (const entry of args) {
      if (Array.isArray(entry)) {
        console.info(...entry);
      } else {
        console.info(entry);
      }
    }
  }

  let totalTasks = 0;

  console.groupCollapsed(`Active Categories: ${this.tasks.size}`);
  for (const [category, tasks] of this.tasks) {
    console.group(`${category} | Running Tasks: ${tasks.size}`);
    totalTasks += tasks.size;
    console.info([].concat([...tasks.keys()]));
    console.groupEnd();
  }
  console.groupEnd();
  if (totalTasks) {
    console.log('Total Running Tasks: ', totalTasks);
  }

  console.groupEnd();
}
