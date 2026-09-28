const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../src/utils/validators');

describe('Validators Unit Tests', () => {
  describe('validateCreateTask', () => {
    test('returns null for valid minimal task body', () => {
      const body = { title: 'Test Task' };
      expect(validateCreateTask(body)).toBeNull();
    });

    test('returns null for valid full task body', () => {
      const body = {
        title: 'Full Task',
        description: 'A detailed description',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-12-31T23:59:59.000Z',
      };
      expect(validateCreateTask(body)).toBeNull();
    });

    test('handles missing or non-object body gracefully', () => {
      expect(validateCreateTask(null)).toMatch(/request body must be an object/);
      expect(validateCreateTask(undefined)).toMatch(/request body must be an object/);
      expect(validateCreateTask('not-an-object')).toMatch(/request body must be an object/);
    });

    test('returns error when title is missing', () => {
      expect(validateCreateTask({})).toMatch(/title is required/);
    });

    test('returns error when title is not a string', () => {
      expect(validateCreateTask({ title: 12345 })).toMatch(/title is required/);
      expect(validateCreateTask({ title: true })).toMatch(/title is required/);
    });

    test('returns error when title is empty or whitespace only', () => {
      expect(validateCreateTask({ title: '' })).toMatch(/title is required/);
      expect(validateCreateTask({ title: '   ' })).toMatch(/title is required/);
    });

    test('returns error when status is invalid', () => {
      expect(validateCreateTask({ title: 'Task', status: 'invalid_status' })).toMatch(
        /status must be one of: todo, in_progress, done/
      );
    });

    test('returns error when priority is invalid', () => {
      expect(validateCreateTask({ title: 'Task', priority: 'urgent' })).toMatch(
        /priority must be one of: low, medium, high/
      );
    });

    test('returns error when dueDate is not a valid date string', () => {
      expect(validateCreateTask({ title: 'Task', dueDate: 'not-a-date' })).toMatch(
        /dueDate must be a valid ISO date string/
      );
    });
  });

  describe('validateUpdateTask', () => {
    test('returns null for valid update payload', () => {
      expect(validateUpdateTask({ title: 'Updated Title', status: 'in_progress', priority: 'low' })).toBeNull();
    });

    test('returns null for empty update payload', () => {
      expect(validateUpdateTask({})).toBeNull();
    });

    test('handles missing or non-object body gracefully', () => {
      expect(validateUpdateTask(null)).toMatch(/request body must be an object/);
      expect(validateUpdateTask(undefined)).toMatch(/request body must be an object/);
    });

    test('returns error when title is provided as empty string or whitespace', () => {
      expect(validateUpdateTask({ title: '' })).toMatch(/title must be a non-empty string/);
      expect(validateUpdateTask({ title: '   ' })).toMatch(/title must be a non-empty string/);
    });

    test('returns error when title is not a string', () => {
      expect(validateUpdateTask({ title: 999 })).toMatch(/title must be a non-empty string/);
    });

    test('returns error when status is invalid', () => {
      expect(validateUpdateTask({ status: 'completed' })).toMatch(
        /status must be one of: todo, in_progress, done/
      );
    });

    test('returns error when priority is invalid', () => {
      expect(validateUpdateTask({ priority: 'critical' })).toMatch(
        /priority must be one of: low, medium, high/
      );
    });

    test('returns error when dueDate is invalid', () => {
      expect(validateUpdateTask({ dueDate: 'yesterday' })).toMatch(
        /dueDate must be a valid ISO date string/
      );
    });
  });

  describe('validateAssignTask', () => {
    test('returns null for valid assignee string', () => {
      expect(validateAssignTask({ assignee: 'Alice Johnson' })).toBeNull();
    });

    test('returns error when body is missing or not an object', () => {
      expect(validateAssignTask(null)).toMatch(/request body must be an object/);
      expect(validateAssignTask(undefined)).toMatch(/request body must be an object/);
      expect(validateAssignTask('invalid')).toMatch(/request body must be an object/);
    });

    test('returns error when assignee is missing', () => {
      expect(validateAssignTask({})).toMatch(/assignee is required and must be a non-empty string/);
    });

    test('returns error when assignee is not a string', () => {
      expect(validateAssignTask({ assignee: 1234 })).toMatch(/assignee is required/);
      expect(validateAssignTask({ assignee: null })).toMatch(/assignee is required/);
      expect(validateAssignTask({ assignee: {} })).toMatch(/assignee is required/);
    });

    test('returns error when assignee is empty or whitespace only', () => {
      expect(validateAssignTask({ assignee: '' })).toMatch(/assignee is required and must be a non-empty string/);
      expect(validateAssignTask({ assignee: '   ' })).toMatch(/assignee is required and must be a non-empty string/);
    });
  });
});
