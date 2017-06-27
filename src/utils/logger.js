export default function printLog(level, ...args) {
  if ( level === 'warn' || level === 'error' || level === 'info' || level === 'log' ) {
    this.logger(`${this.config.icon || ''} [saga-task-manager] | ${this.getName()} | ${level.toUpperCase()} | ${args[0]}`)
    for ( let entry of args.slice(1) ) {
      console[level](entry)
    }
  } else {

    this.logger(`${this.config.icon || ''} [saga-task-manager] | ${this.getName()} | ${level}`)
    for ( let entry of args ) {
      console.info(entry)
    }
  }

  let totalTasks = 0

  console.groupCollapsed(`Active Categories: ${this.tasks.size}`)
  for ( let [ category, tasks ] of this.tasks ) {
    console.group(`${category} | Running Tasks: ${tasks.size}`)
      totalTasks = totalTasks + tasks.size
      console.info([].concat([...tasks.keys()]))
    console.groupEnd()
  }
  console.groupEnd()
  if ( totalTasks ) {
    console.log('Total Running Tasks: ', totalTasks)
  }

  console.groupEnd()
}
