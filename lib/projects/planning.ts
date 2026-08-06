import { getSql } from '@/lib/db/client';

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function createMilestone(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    name: string;
    description?: string | null;
    plannedStart?: string | null;
    plannedEnd?: string | null;
    sortOrder?: number;
  }
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      INSERT INTO milestones (
        tenant_id, project_id, name, description, planned_start, planned_end, sort_order, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId}, ${input.name},
        ${input.description || null}, ${input.plannedStart || null}, ${input.plannedEnd || null},
        ${input.sortOrder ?? 0}, ${input.userId || null}
      )
      RETURNING *
    `;
    return row;
  });
}

export async function updateMilestone(
  schemaName: string,
  projectId: string,
  milestoneId: string,
  patch: Record<string, unknown>,
  userId?: string | null
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      UPDATE milestones SET
        name = COALESCE(${(patch.name as string) ?? null}, name),
        description = COALESCE(${(patch.description as string) ?? null}, description),
        status = COALESCE(${(patch.status as string) ?? null}, status),
        planned_start = COALESCE(${(patch.plannedStart as string) ?? null}, planned_start),
        planned_end = COALESCE(${(patch.plannedEnd as string) ?? null}, planned_end),
        actual_start = COALESCE(${(patch.actualStart as string) ?? null}, actual_start),
        actual_end = COALESCE(${(patch.actualEnd as string) ?? null}, actual_end),
        sort_order = COALESCE(${typeof patch.sortOrder === 'number' ? patch.sortOrder : null}, sort_order),
        updated_by = ${userId || null},
        updated_at = NOW()
      WHERE id = ${milestoneId} AND project_id = ${projectId} AND deleted_at IS NULL
      RETURNING *
    `;
    return row || null;
  });
}

export async function createTask(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    milestoneId?: string | null;
    name: string;
    description?: string | null;
    priority?: string;
    assigneeId?: string | null;
    plannedStart?: string | null;
    plannedEnd?: string | null;
    progressPct?: number;
  }
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const progress = Math.min(100, Math.max(0, input.progressPct ?? 0));
    const [row] = await tx`
      INSERT INTO tasks (
        tenant_id, project_id, milestone_id, name, description, priority,
        assignee_id, planned_start, planned_end, progress_pct, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId}, ${input.milestoneId || null},
        ${input.name}, ${input.description || null}, ${input.priority || 'medium'},
        ${input.assigneeId || null}, ${input.plannedStart || null}, ${input.plannedEnd || null},
        ${progress}, ${input.userId || null}
      )
      RETURNING *
    `;
    return row;
  });
}

export async function updateTask(
  schemaName: string,
  projectId: string,
  taskId: string,
  patch: Record<string, unknown>,
  userId?: string | null
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const progress =
      typeof patch.progressPct === 'number'
        ? Math.min(100, Math.max(0, patch.progressPct))
        : null;
    const [row] = await tx`
      UPDATE tasks SET
        name = COALESCE(${(patch.name as string) ?? null}, name),
        description = COALESCE(${(patch.description as string) ?? null}, description),
        status = COALESCE(${(patch.status as string) ?? null}, status),
        priority = COALESCE(${(patch.priority as string) ?? null}, priority),
        milestone_id = COALESCE(${(patch.milestoneId as string) ?? null}, milestone_id),
        assignee_id = COALESCE(${(patch.assigneeId as string) ?? null}, assignee_id),
        planned_start = COALESCE(${(patch.plannedStart as string) ?? null}, planned_start),
        planned_end = COALESCE(${(patch.plannedEnd as string) ?? null}, planned_end),
        actual_start = COALESCE(${(patch.actualStart as string) ?? null}, actual_start),
        actual_end = COALESCE(${(patch.actualEnd as string) ?? null}, actual_end),
        progress_pct = COALESCE(${progress}, progress_pct),
        updated_by = ${userId || null},
        updated_at = NOW()
      WHERE id = ${taskId} AND project_id = ${projectId} AND deleted_at IS NULL
      RETURNING *
    `;
    return row || null;
  });
}

/** Finish-to-start dependency (PRD §8.4). Rejects self-deps and simple cycles. */
export async function addTaskDependency(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    predecessorTaskId: string;
    successorTaskId: string;
    lagDays?: number;
  }
) {
  if (input.predecessorTaskId === input.successorTaskId) {
    throw new Error('A task cannot depend on itself');
  }

  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    const [pred] = await tx`
      SELECT id FROM tasks
      WHERE id = ${input.predecessorTaskId} AND project_id = ${input.projectId} AND deleted_at IS NULL
      LIMIT 1
    `;
    const [succ] = await tx`
      SELECT id FROM tasks
      WHERE id = ${input.successorTaskId} AND project_id = ${input.projectId} AND deleted_at IS NULL
      LIMIT 1
    `;
    if (!pred || !succ) throw new Error('Both tasks must belong to this project');

    // Cycle check: if successor already reaches predecessor, reject
    const edges = await tx`
      SELECT predecessor_task_id, successor_task_id
      FROM task_dependencies
      WHERE project_id = ${input.projectId} AND deleted_at IS NULL
    `;
    const adj = new Map<string, string[]>();
    for (const e of edges as Array<{ predecessor_task_id: string; successor_task_id: string }>) {
      const list = adj.get(e.predecessor_task_id) || [];
      list.push(e.successor_task_id);
      adj.set(e.predecessor_task_id, list);
    }
    // Tentative edge
    const tent = adj.get(input.predecessorTaskId) || [];
    tent.push(input.successorTaskId);
    adj.set(input.predecessorTaskId, tent);

    const seen = new Set<string>();
    const stack = [input.successorTaskId];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === input.predecessorTaskId) {
        throw new Error('Dependency would create a cycle');
      }
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const n of adj.get(cur) || []) stack.push(n);
    }

    const [row] = await tx`
      INSERT INTO task_dependencies (
        tenant_id, project_id, predecessor_task_id, successor_task_id,
        dependency_type, lag_days, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId},
        ${input.predecessorTaskId}, ${input.successorTaskId},
        'FS', ${input.lagDays ?? 0}, ${input.userId || null}
      )
      RETURNING *
    `;
    return row;
  });
}

/** Gantt payload: tasks + FS dependencies for read/basic edit UIs. */
export async function getGanttData(schemaName: string, projectId: string) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    const milestones = await tx`
      SELECT * FROM milestones
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY sort_order, planned_start NULLS LAST, name
    `;
    const tasks = await tx`
      SELECT * FROM tasks
      WHERE project_id = ${projectId} AND deleted_at IS NULL
      ORDER BY sort_order, planned_start NULLS LAST, name
    `;
    const dependencies = await tx`
      SELECT * FROM task_dependencies
      WHERE project_id = ${projectId} AND deleted_at IS NULL
    `;

    return {
      milestones,
      tasks,
      dependencies,
      meta: {
        dependencyType: 'FS',
        criticalPath: null,
        note: 'CPM / critical-path is P1; v1 renders FS dependencies only',
      },
    };
  });
}

export async function upsertBoqItem(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    code: string;
    description: string;
    unitOfMeasure?: string;
    quantity: number;
    unitRate: number;
    category?: string | null;
    sortOrder?: number;
  }
) {
  const amount = round2(Number(input.quantity) * Number(input.unitRate));
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      INSERT INTO boq_items (
        tenant_id, project_id, code, description, unit_of_measure,
        quantity, unit_rate, amount, category, sort_order, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId}, ${input.code}, ${input.description},
        ${input.unitOfMeasure || 'nos'}, ${input.quantity}, ${input.unitRate}, ${amount},
        ${input.category || null}, ${input.sortOrder ?? 0}, ${input.userId || null}
      )
      ON CONFLICT (project_id, code) DO UPDATE SET
        description = EXCLUDED.description,
        unit_of_measure = EXCLUDED.unit_of_measure,
        quantity = EXCLUDED.quantity,
        unit_rate = EXCLUDED.unit_rate,
        amount = EXCLUDED.amount,
        category = EXCLUDED.category,
        sort_order = EXCLUDED.sort_order,
        deleted_at = NULL,
        updated_by = ${input.userId || null},
        updated_at = NOW()
      RETURNING *
    `;
    return row;
  });
}

export async function createDrawingVersion(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    drawingNo: string;
    title: string;
    discipline?: string | null;
    fileUrl?: string | null;
    fileName?: string | null;
    notes?: string | null;
    supersedesId?: string | null;
  }
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    let version = 1;
    let supersedesId = input.supersedesId || null;

    if (supersedesId) {
      const [prev] = await tx`
        SELECT id, version, drawing_no FROM drawings
        WHERE id = ${supersedesId} AND project_id = ${input.projectId} AND deleted_at IS NULL
        LIMIT 1
      `;
      if (!prev) throw new Error('Superseded drawing not found');
      version = Number(prev.version) + 1;
      await tx`
        UPDATE drawings SET is_current = false, updated_at = NOW()
        WHERE id = ${supersedesId}
      `;
    } else {
      // New revision of same drawing_no bumps version of current
      const [cur] = await tx`
        SELECT id, version FROM drawings
        WHERE project_id = ${input.projectId}
          AND drawing_no = ${input.drawingNo}
          AND is_current = true
          AND deleted_at IS NULL
        LIMIT 1
      `;
      if (cur) {
        supersedesId = cur.id;
        version = Number(cur.version) + 1;
        await tx`
          UPDATE drawings SET is_current = false, updated_at = NOW()
          WHERE id = ${cur.id}
        `;
      }
    }

    const [row] = await tx`
      INSERT INTO drawings (
        tenant_id, project_id, drawing_no, title, discipline, version,
        file_url, file_name, supersedes_id, is_current, notes, status, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId}, ${input.drawingNo}, ${input.title},
        ${input.discipline || null}, ${version},
        ${input.fileUrl || null}, ${input.fileName || null}, ${supersedesId},
        true, ${input.notes || null}, 'issued', ${input.userId || null}
      )
      RETURNING *
    `;
    return row;
  });
}

export async function createRfiVersion(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    rfiNo: string;
    subject: string;
    question: string;
    assignedTo?: string | null;
    dueDate?: string | null;
    supersedesId?: string | null;
  }
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);

    let version = 1;
    let supersedesId = input.supersedesId || null;

    if (supersedesId) {
      const [prev] = await tx`
        SELECT id, version FROM rfis
        WHERE id = ${supersedesId} AND project_id = ${input.projectId} AND deleted_at IS NULL
        LIMIT 1
      `;
      if (!prev) throw new Error('Superseded RFI not found');
      version = Number(prev.version) + 1;
      await tx`
        UPDATE rfis SET is_current = false, updated_at = NOW() WHERE id = ${supersedesId}
      `;
    } else {
      const [cur] = await tx`
        SELECT id, version FROM rfis
        WHERE project_id = ${input.projectId}
          AND rfi_no = ${input.rfiNo}
          AND is_current = true
          AND deleted_at IS NULL
        LIMIT 1
      `;
      if (cur) {
        supersedesId = cur.id;
        version = Number(cur.version) + 1;
        await tx`
          UPDATE rfis SET is_current = false, updated_at = NOW() WHERE id = ${cur.id}
        `;
      }
    }

    const [row] = await tx`
      INSERT INTO rfis (
        tenant_id, project_id, rfi_no, subject, question, version,
        supersedes_id, is_current, raised_by, assigned_to, due_date, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId}, ${input.rfiNo}, ${input.subject},
        ${input.question}, ${version}, ${supersedesId}, true,
        ${input.userId || null}, ${input.assignedTo || null}, ${input.dueDate || null},
        ${input.userId || null}
      )
      RETURNING *
    `;
    return row;
  });
}

export async function createIssue(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    title: string;
    description?: string | null;
    severity?: string;
    assigneeId?: string | null;
    dueDate?: string | null;
  }
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      INSERT INTO issues (
        tenant_id, project_id, title, description, severity, assignee_id, due_date, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId}, ${input.title},
        ${input.description || null}, ${input.severity || 'medium'},
        ${input.assigneeId || null}, ${input.dueDate || null}, ${input.userId || null}
      )
      RETURNING *
    `;
    return row;
  });
}

export async function createApproval(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    entityType: string;
    entityId: string;
    comments?: string | null;
  }
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      INSERT INTO approvals (
        tenant_id, project_id, entity_type, entity_id, requested_by, comments, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId}, ${input.entityType}, ${input.entityId},
        ${input.userId || null}, ${input.comments || null}, ${input.userId || null}
      )
      RETURNING *
    `;
    return row;
  });
}

export async function decideApproval(
  schemaName: string,
  projectId: string,
  approvalId: string,
  decision: 'approved' | 'rejected',
  userId?: string | null,
  comments?: string | null
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      UPDATE approvals SET
        status = ${decision},
        decided_by = ${userId || null},
        decided_at = NOW(),
        comments = COALESCE(${comments || null}, comments),
        updated_by = ${userId || null},
        updated_at = NOW()
      WHERE id = ${approvalId} AND project_id = ${projectId} AND deleted_at IS NULL
      RETURNING *
    `;
    return row || null;
  });
}

export async function upsertBudgetLine(
  schemaName: string,
  input: {
    tenantId: string;
    userId?: string | null;
    projectId: string;
    category: string;
    plannedAmount: number;
    revisedAmount?: number | null;
    notes?: string | null;
  }
) {
  const sql = getSql();
  return sql.begin(async (tx) => {
    await tx.unsafe(`SET LOCAL search_path TO "${schemaName}", public`);
    const [row] = await tx`
      INSERT INTO project_budgets (
        tenant_id, project_id, category, planned_amount, revised_amount, notes, created_by
      )
      VALUES (
        ${input.tenantId}, ${input.projectId}, ${input.category},
        ${input.plannedAmount}, ${input.revisedAmount ?? null}, ${input.notes || null},
        ${input.userId || null}
      )
      ON CONFLICT (project_id, category) DO UPDATE SET
        planned_amount = EXCLUDED.planned_amount,
        revised_amount = EXCLUDED.revised_amount,
        notes = EXCLUDED.notes,
        deleted_at = NULL,
        updated_by = ${input.userId || null},
        updated_at = NOW()
      RETURNING *
    `;
    return row;
  });
}
