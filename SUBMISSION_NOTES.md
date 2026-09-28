# Submission Notes — The Untested API

## 1. Test Suite & Coverage Summary

A full test suite was built with unit tests (`taskService.test.js`, `validators.test.js`) and end-to-end integration tests using Supertest (`tasks.routes.test.js`).

### Coverage Report
```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.63 |    93.57 |   93.33 |   97.41 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |     87.5 |     100 |     100 |                   
  tasks.js       |     100 |     87.5 |     100 |     100 |                   
 src/services    |     100 |     90.9 |     100 |     100 |                   
  taskService.js |     100 |     90.9 |     100 |     100 |                   
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------

Test Suites: 3 passed, 3 total
Tests:       78 passed, 78 total
Snapshots:   0 total
```
*(Uncovered lines in `app.js` correspond only to the direct CLI startup `app.listen()` block when running `node app.js` directly and the internal 500 error catchall).*

---

## 2. Design Decisions for `PATCH /tasks/:id/assign`

The assignment requested adding:
```
PATCH /tasks/:id/assign
Body: { "assignee": "string" }
```

### Key Decisions:
1. **Assignee Validation:**
   - Evaluated using a dedicated validator function `validateAssignTask(body)`.
   - Rejects non-string types (`number`, `boolean`, `null`, `object`) with a clear 400 Bad Request error.
   - Rejects empty strings `""` and whitespace-only strings `"   "` with 400 Bad Request.
   - Trims leading and trailing whitespace so that names are stored cleanly (e.g. `" Alice "` becomes `"Alice"`).
2. **Re-assignment Behavior:**
   - Re-assigning an already assigned task is supported by default. In a collaborative workflow, re-assigning a task to another teammate is a standard operation.
3. **Task Shape Consistency:**
   - Defaulted `assignee: null` on new task creation in `taskService.create()` so that all task objects maintain a predictable schema whether assigned or unassigned.
4. **Error Responses:**
   - Returns `404 { "error": "Task not found" }` if the target UUID does not exist.
   - Returns `400 { "error": "..." }` for validation failures.

---

## 3. What Surprised Me in the Codebase

1. **Silent Priority Corruption in `completeTask`:**
   Seeing `priority: 'medium'` hardcoded into the completion logic was the most surprising bug. It was a classic "copy-paste default" error that would have caused silent data loss in production whenever high-priority tasks were resolved.
2. **Documentation vs Code Status Enum Mismatch:**
   `README.md` documented statuses as `pending | in-progress | completed`, whereas the actual validator code and `ASSIGNMENT.md` strictly required `todo | in_progress | done`. This highlighted the importance of testing behavior against real implementations rather than relying solely on external docs.
3. **Substring Matching in Status Filter:**
   Using `status.includes(...)` caused `/tasks?status=do` to match both `todo` and `done`. In an API, exact enum matching should almost always be the default unless full-text search is explicitly intended.

---

## 4. What I'd Test Next (Given More Time)

1. **Concurrent Request Handling:**
   While Node.js is single-threaded, if this service were moved to a clustered environment or persistent database, race conditions could arise during simultaneous updates to the same task.
2. **Prototype Pollution & Security Hardening:**
   Add tests verifying that malicious payloads (e.g. `{"__proto__": ...}` or oversized strings) cannot pollute object prototypes or crash the server.
3. **Sorting & Complex Query Combinations:**
   Add tests for combined filters: sorting by `dueDate` or `priority`, filtering by both `status` and `priority`, and multi-page pagination edge cases with varying page sizes.
4. **Load & Stress Testing:**
   Benchmark in-memory array operations (`tasks.slice`, `tasks.filter`) with 100,000+ items to profile memory usage and response latency.

---

## 5. Questions Before Shipping to Production

1. **Persistence & Database Strategy:**
   The current store is in-memory and data resets on restart. Which database (e.g., PostgreSQL, MongoDB, Redis) will be adopted for production?
2. **Authentication & Authorization (RBAC):**
   Who can create, assign, or delete tasks? Are users permitted to edit tasks assigned to others, or should there be role-based permissions?
3. **Assignee Reference Integrity:**
   Currently, `assignee` is an arbitrary string. Should this reference a verified `userId` from an existing User service or database?
4. **Pagination Response Metadata:**
   Should paginated responses return pagination metadata (e.g., `{ data: [...], totalCount: 42, totalPages: 5, currentPage: 1 }`) instead of a raw array?
5. **Soft Deletes vs Hard Deletes:**
   `DELETE /tasks/:id` permanently removes the task. Would users expect a soft delete (`deletedAt` timestamp) or audit trail for compliance?
