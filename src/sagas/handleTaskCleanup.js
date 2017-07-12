export default function* handleTaskCleanup(category, id) {
  const categoryTasks = this.getCategory(category);
  if (categoryTasks && categoryTasks.has(id)) {
    categoryTasks.delete(id);
    if (categoryTasks.size === 0) {
      this.tasks.delete(category);
      this.handleCategoryComplete(category);
    }
  }
}
