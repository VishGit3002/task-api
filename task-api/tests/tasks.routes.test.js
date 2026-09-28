const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('GET /tasks', () => {
    test('returns empty array when there are no tasks', async () => {
      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('returns list of all tasks', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app).get('/tasks');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    test('filters tasks by status', async () => {
      taskService.create({ title: 'Task 1', status: 'todo' });
      taskService.create({ title: 'Task 2', status: 'in_progress' });
      taskService.create({ title: 'Task 3', status: 'done' });

      const res = await request(app).get('/tasks?status=in_progress');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task 2');
    });

    test('supports pagination with page and limit query params', async () => {
      taskService.create({ title: 'Page 1 - Item 1' });
      taskService.create({ title: 'Page 1 - Item 2' });
      taskService.create({ title: 'Page 2 - Item 1' });

      const res = await request(app).get('/tasks?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Page 1 - Item 1');
      expect(res.body[1].title).toBe('Page 1 - Item 2');
    });

    test('supports pagination combined with status filter', async () => {
      taskService.create({ title: 'Todo 1', status: 'todo' });
      taskService.create({ title: 'Todo 2', status: 'todo' });
      taskService.create({ title: 'Todo 3', status: 'todo' });
      taskService.create({ title: 'Done 1', status: 'done' });

      const res = await request(app).get('/tasks?status=todo&page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Todo 1');
      expect(res.body[1].title).toBe('Todo 2');
    });
  });

  describe('POST /tasks', () => {
    test('creates a new task with default values and returns 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'New API Task' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New API Task');
      expect(res.body.status).toBe('todo');
      expect(res.body.priority).toBe('medium');
      expect(res.body.description).toBe('');
      expect(res.body.dueDate).toBeNull();
      expect(res.body.assignee).toBeNull();
      expect(res.body.completedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    test('creates a task with custom fields', async () => {
      const dueDate = '2026-10-15T12:00:00.000Z';
      const res = await request(app)
        .post('/tasks')
        .send({
          title: 'Custom Task',
          description: 'Custom description',
          status: 'in_progress',
          priority: 'high',
          dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Custom Task');
      expect(res.body.description).toBe('Custom description');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.priority).toBe('high');
      expect(res.body.dueDate).toBe(dueDate);
    });

    test('returns 400 when title is missing', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title is required/);
    });

    test('returns 400 when status is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Bad Status', status: 'archived' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    test('returns 400 when priority is invalid', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Bad Priority', priority: 'extreme' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/priority must be one of/);
    });

    test('returns 400 when dueDate is not a valid date', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Bad Date', dueDate: 'invalid-date-string' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dueDate must be a valid ISO date string/);
    });
  });

  describe('PUT /tasks/:id', () => {
    test('updates an existing task successfully', async () => {
      const created = taskService.create({ title: 'Original Task', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: 'Updated Task', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Task');
      expect(res.body.priority).toBe('high');
      expect(res.body.status).toBe('todo');
    });

    test('returns 404 when task does not exist', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Does not exist' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 when payload contains invalid status', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ status: 'invalid_status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status must be one of/);
    });

    test('returns 400 when title is set to empty string', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${created.id}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title must be a non-empty string/);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('deletes an existing task and returns 204', async () => {
      const created = taskService.create({ title: 'To be deleted' });

      const res = await request(app).delete(`/tasks/${created.id}`);
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});

      // Confirm it was deleted from taskService
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('returns 404 when attempting to delete non-existent task', async () => {
      const res = await request(app).delete('/tasks/random-non-existent-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    test('marks task as done, sets completedAt timestamp, and preserves priority', async () => {
      const created = taskService.create({ title: 'Complete Me', priority: 'high' });

      const res = await request(app).patch(`/tasks/${created.id}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
      expect(new Date(res.body.completedAt).getTime()).not.toBeNaN();
      expect(res.body.priority).toBe('high');
    });

    test('returns 404 when marking non-existent task as complete', async () => {
      const res = await request(app).patch('/tasks/unknown-task-id/complete');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });
  });

  describe('PATCH /tasks/:id/assign', () => {
    test('assigns an assignee to a task and returns 200 with updated task', async () => {
      const created = taskService.create({ title: 'Assign Feature' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Jane Doe' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Jane Doe');
      expect(res.body.id).toBe(created.id);
    });

    test('trims leading and trailing whitespace from assignee', async () => {
      const created = taskService.create({ title: 'Whitespace Task' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '   John Doe   ' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('John Doe');
    });

    test('allows reassigning an already assigned task', async () => {
      const created = taskService.create({ title: 'Reassign Task', assignee: 'Jane' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 'Mark' });

      expect(res.status).toBe(200);
      expect(res.body.assignee).toBe('Mark');
    });

    test('returns 404 when task does not exist', async () => {
      const res = await request(app)
        .patch('/tasks/unknown-task-id/assign')
        .send({ assignee: 'Jane' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 400 when assignee is missing from body', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required and must be a non-empty string/);
    });

    test('returns 400 when assignee is empty or whitespace only', async () => {
      const created = taskService.create({ title: 'Task' });

      const res1 = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '' });
      expect(res1.status).toBe(400);

      const res2 = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: '    ' });
      expect(res2.status).toBe(400);
    });

    test('returns 400 when assignee is not a string', async () => {
      const created = taskService.create({ title: 'Task' });

      const res = await request(app)
        .patch(`/tasks/${created.id}/assign`)
        .send({ assignee: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/assignee is required/);
    });
  });

  describe('GET /tasks/stats', () => {
    test('returns stats with counts and overdue totals', async () => {
      const past = new Date(Date.now() - 100000).toISOString();
      taskService.create({ title: 'T1', status: 'todo', dueDate: past });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done', dueDate: past });

      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });

    test('returns zeroed stats when no tasks exist', async () => {
      const res = await request(app).get('/tasks/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });
});
