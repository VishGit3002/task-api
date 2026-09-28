# Bug Report — The Untested API

This report documents the bugs discovered during test-driven analysis of the Task Manager API codebase. Each bug details the expected behavior, actual behavior, root cause, code location, how it was discovered via tests, and the implemented fix.

---

### Bug 1: `completeTask` silently overwrites task priority to `'medium'`

- **Location:** `src/services/taskService.js` (lines 67–72)
- **Root Cause:**
  When marking a task as complete, the object spread was followed by a hardcoded `priority: 'medium'`:
  ```javascript
  const updated = {
    ...task,
    priority: 'medium', // Overwrites existing priority
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```
- **Expected Behavior:** Marking a task as complete should only update `status` to `'done'` and set `completedAt`. The task's existing priority (`low`, `medium`, or `high`) must be preserved.
- **Actual Behavior:** Any task marked as complete (even if it was originally `high` or `low`) was silently changed to `medium` priority, causing data corruption.
- **How Discovered:**
  Discovered via unit test `TaskService Unit Tests › completeTask › preserves the original priority when completing task` and route test `PATCH /tasks/:id/complete`:
  ```
  Expected: "high"
  Received: "medium"
  ```
- **Fix:**
  Removed `priority: 'medium'` from `completeTask`:
  ```javascript
  const updated = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
  };
  ```

---

### Bug 2: Off-by-one pagination calculation skips the first page of results

- **Location:** `src/services/taskService.js` (lines 11–14)
- **Root Cause:**
  The offset calculation used `offset = page * limit` instead of the standard 1-based index formula `offset = (page - 1) * limit`:
  ```javascript
  const getPaginated = (page, limit) => {
    const offset = page * limit;
    return tasks.slice(offset, offset + limit);
  };
  ```
- **Expected Behavior:** Requesting page 1 with limit 10 (`/tasks?page=1&limit=10`) should return the first 10 items (indexes 0 to 9).
- **Actual Behavior:** With `page = 1` and `limit = 10`, `offset` became `1 * 10 = 10`, skipping the first 10 items entirely and returning page 2.
- **How Discovered:**
  Discovered via unit test `TaskService Unit Tests › getPaginated › returns the first page items correctly for page 1`:
  ```
  Expected: "Task 1"
  Received: "Task 3"
  ```
- **Fix:**
  Updated the formula to use `(pageNum - 1) * limitNum` with safety floor (`Math.max(1, page)`):
  ```javascript
  const getPaginated = (page, limit) => {
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, limit);
    const offset = (pageNum - 1) * limitNum;
    return tasks.slice(offset, offset + limitNum);
  };
  ```

---

### Bug 3: `getByStatus` performs substring matching instead of exact matching

- **Location:** `src/services/taskService.js` (line 9)
- **Root Cause:**
  The filter function used `String.prototype.includes`:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
  ```
- **Expected Behavior:** Querying by status should strictly match the requested status (e.g., `status === 'todo'`).
- **Actual Behavior:** Partial substrings matched unrelated statuses. For example, querying `'do'` matched both `'todo'` and `'done'`.
- **How Discovered:**
  Discovered via unit test `TaskService Unit Tests › getByStatus › does not return tasks matching partial substrings`:
  ```
  Expected length: 0
  Received length: 2 (both 'todo' and 'done' returned)
  ```
- **Fix:**
  Replaced `.includes()` with strict equality `===`:
  ```javascript
  const getByStatus = (status) => tasks.filter((t) => t.status === status);
  ```

---

### Bug 4: `PUT /tasks/:id` allows overwriting immutable fields (`id`, `createdAt`)

- **Location:** `src/services/taskService.js` (lines 46–53)
- **Root Cause:**
  The update method directly merged the input fields into the stored task object without stripping immutable system attributes:
  ```javascript
  const updated = { ...tasks[index], ...fields };
  ```
- **Expected Behavior:** System-managed attributes (`id`, `createdAt`) should be immutable and protected from client modifications.
- **Actual Behavior:** A PUT request with `{ "id": "tampered-id", "createdAt": "fake-date" }` overwrote the task's primary key and creation timestamp.
- **How Discovered:**
  Discovered via unit test `TaskService Unit Tests › update › prevents overwriting immutable fields like id and createdAt`:
  ```
  Expected: "original-uuid"
  Received: "tampered-id"
  ```
- **Fix:**
  Explicitly excluded `id` and `createdAt` from update payloads:
  ```javascript
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...allowedFields } = fields;
  const updated = { ...tasks[index], ...allowedFields };
  ```

---

### Bug 5: Validator crash on null/undefined or non-object request bodies

- **Location:** `src/utils/validators.js` (lines 4–6 and 20–22)
- **Root Cause:**
  Functions attempted to access `body.title` directly without verifying whether `body` was a valid object:
  ```javascript
  const validateCreateTask = (body) => {
    if (!body.title || typeof body.title !== 'string' ...)
  ```
- **Expected Behavior:** Passing an empty, null, or non-object body should return a 400 Bad Request error.
- **Actual Behavior:** An unhandled `TypeError: Cannot read properties of undefined (reading 'title')` was thrown, escalating to an HTTP 500 Internal Server Error.
- **How Discovered:**
  Discovered during edge case testing with missing or non-object payloads in validator unit tests.
- **Fix:**
  Added defensive body type checks:
  ```javascript
  if (!body || typeof body !== 'object') {
    return 'request body must be an object';
  }
  ```

---

### Bug 6: Documentation discrepancy for valid status values

- **Location:** `README.md` (line 77) vs `ASSIGNMENT.md` (line 50) and `src/utils/validators.js` (line 1)
- **Root Cause:**
  Specification drift between documentation and implementation:
  - `README.md`: `"pending | in-progress | completed"`
  - `ASSIGNMENT.md` & `validators.js`: `['todo', 'in_progress', 'done']`
- **Impact:** Any client following the `README.md` specification receives 400 Bad Request errors when creating tasks.
- **Fix / Resolution:** Maintained alignment with the running codebase and `ASSIGNMENT.md` (`todo`, `in_progress`, `done`) and noted the discrepancy.
