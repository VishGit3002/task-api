const taskService = require('../src/services/taskService');

describe('TaskService Unit Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('creates a task with required title and default attributes', () => {
      const task = taskService.create({ title: 'Learn Jest' });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(typeof task.id).toBe('string');
      expect(task.title).toBe('Learn Jest');
      expect(task.description).toBe('');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.dueDate).toBeNull();
      expect(task.assignee).toBeNull();
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
      expect(new Date(task.createdAt).getTime()).not.toBeNaN();
    });

    test('creates a task with custom attributes', () => {
      const customDate = new Date().toISOString();
      const task = taskService.create({
        title: 'Custom Task',
        description: 'Detailed description',
        status: 'in_progress',
        priority: 'high',
        dueDate: customDate,
        assignee: 'Bob',
      });

      expect(task.title).toBe('Custom Task');
      expect(task.description).toBe('Detailed description');
      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe(customDate);
      expect(task.assignee).toBe('Bob');
    });
  });

  describe('getAll', () => {
    test('returns empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });

    test('returns all created tasks', () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const tasks = taskService.getAll();
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });

    test('returns a shallow copy so mutations do not directly alter internal array reference', () => {
      taskService.create({ title: 'Task 1' });
      const tasks = taskService.getAll();
      tasks.pop();
      expect(taskService.getAll()).toHaveLength(1);
    });
  });

  describe('findById', () => {
    test('returns the task with the matching id', () => {
      const created = taskService.create({ title: 'Find Me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('returns undefined for non-existent id', () => {
      expect(taskService.findById('non-existent-uuid')).toBeUndefined();
    });
  });

  describe('getByStatus', () => {
    test('returns only tasks with matching status', () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'In Progress 1', status: 'in_progress' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const inProgress = taskService.getByStatus('in_progress');
      expect(inProgress).toHaveLength(1);
      expect(inProgress[0].title).toBe('In Progress 1');
    });

    test('does not return tasks matching partial substrings (exact match requirement)', () => {
      taskService.create({ title: 'Todo Task', status: 'todo' });
      taskService.create({ title: 'Done Task', status: 'done' });

      // Searching for 'do' should not return both 'todo' and 'done'
      const matched = taskService.getByStatus('do');
      expect(matched).toHaveLength(0);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('returns the first page items correctly for page 1', () => {
      const page1 = taskService.getPaginated(1, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Task 1');
      expect(page1[1].title).toBe('Task 2');
    });

    test('returns second page items correctly for page 2', () => {
      const page2 = taskService.getPaginated(2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Task 3');
      expect(page2[1].title).toBe('Task 4');
    });

    test('returns remaining items on last partial page', () => {
      const page3 = taskService.getPaginated(3, 2);
      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe('Task 5');
    });

    test('returns empty array if page is out of range', () => {
      const pageEmpty = taskService.getPaginated(10, 2);
      expect(pageEmpty).toEqual([]);
    });

    test('handles page values less than 1 gracefully by defaulting to page 1', () => {
      const result = taskService.getPaginated(0, 2);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Task 1');
    });
  });

  describe('update', () => {
    test('updates specified fields of an existing task', () => {
      const task = taskService.create({ title: 'Old Title', priority: 'low' });
      const updated = taskService.update(task.id, {
        title: 'New Title',
        priority: 'high',
      });

      expect(updated.title).toBe('New Title');
      expect(updated.priority).toBe('high');
      expect(updated.status).toBe('todo'); // unchanged
    });

    test('returns null when updating non-existent task', () => {
      const result = taskService.update('non-existent-id', { title: 'New' });
      expect(result).toBeNull();
    });

    test('prevents overwriting immutable fields like id and createdAt', () => {
      const task = taskService.create({ title: 'Original' });
      const originalCreatedAt = task.createdAt;

      const updated = taskService.update(task.id, {
        id: 'tampered-id',
        createdAt: '1970-01-01T00:00:00.000Z',
        title: 'Updated',
      });

      expect(updated.id).toBe(task.id);
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.title).toBe('Updated');
    });
  });

  describe('remove', () => {
    test('removes task and returns true', () => {
      const task = taskService.create({ title: 'To Delete' });
      const removed = taskService.remove(task.id);

      expect(removed).toBe(true);
      expect(taskService.findById(task.id)).toBeUndefined();
      expect(taskService.getAll()).toHaveLength(0);
    });

    test('returns false when task id does not exist', () => {
      expect(taskService.remove('fake-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('marks task as done and sets completedAt timestamp', () => {
      const task = taskService.create({ title: 'Finish homework', priority: 'high' });
      const completed = taskService.completeTask(task.id);

      expect(completed).toBeDefined();
      expect(completed.status).toBe('done');
      expect(completed.completedAt).toBeDefined();
      expect(new Date(completed.completedAt).getTime()).not.toBeNaN();
    });

    test('preserves the original priority when completing task', () => {
      const highTask = taskService.create({ title: 'Urgent', priority: 'high' });
      const completed = taskService.completeTask(highTask.id);

      expect(completed.priority).toBe('high');
    });

    test('returns null when completing non-existent task', () => {
      expect(taskService.completeTask('fake-id')).toBeNull();
    });
  });

  describe('assignTask', () => {
    test('assigns task to a user and returns updated task', () => {
      const task = taskService.create({ title: 'Write tests' });
      const updated = taskService.assignTask(task.id, 'Alice');

      expect(updated).toBeDefined();
      expect(updated.assignee).toBe('Alice');
      expect(taskService.findById(task.id).assignee).toBe('Alice');
    });

    test('trims whitespace from assignee name', () => {
      const task = taskService.create({ title: 'Write docs' });
      const updated = taskService.assignTask(task.id, '  Bob Smith  ');

      expect(updated.assignee).toBe('Bob Smith');
    });

    test('allows reassigning a task to a different user', () => {
      const task = taskService.create({ title: 'Deploy', assignee: 'Alice' });
      const updated = taskService.assignTask(task.id, 'Charlie');

      expect(updated.assignee).toBe('Charlie');
    });

    test('returns null when assigning non-existent task', () => {
      expect(taskService.assignTask('unknown-id', 'Alice')).toBeNull();
    });
  });

  describe('getStats', () => {
    test('returns all zero counts when no tasks exist', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    test('correctly tallies task statuses and overdue counts', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day future

      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate }); // overdue
      taskService.create({ title: 'T2', status: 'in_progress', dueDate: pastDate }); // overdue
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate }); // past, but done -> NOT overdue
      taskService.create({ title: 'T4', status: 'todo', dueDate: futureDate }); // not overdue
      taskService.create({ title: 'T5', status: 'todo', dueDate: null }); // no due date

      const stats = taskService.getStats();
      expect(stats.todo).toBe(3);
      expect(stats.in_progress).toBe(1);
      expect(stats.done).toBe(1);
      expect(stats.overdue).toBe(2);
    });
  });
});
