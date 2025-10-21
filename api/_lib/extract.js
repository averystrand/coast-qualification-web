function cleanDomain(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function findDomain(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidates = [
    payload.domain,
    payload.Domain,
    payload.emailDomain,
    payload.email_domain,
    payload.companyDomain,
    payload.company_domain,
    payload.normalized?.Domain,
    payload.normalized?.domain,
    payload.normalized?.Company_Domain,
    payload.row?.inputs?.Domain,
    payload.row?.outputs?.Domain,
    payload.row?.input?.Domain,
    payload.row?.output?.Domain,
    payload.data?.Domain,
    payload.data?.domain,
    payload.original?.Domain,
    payload.input?.Domain,
    payload.inputs?.Domain,
    payload.output?.Domain,
    payload.outputs?.Domain,
  ];

  for (const candidate of candidates) {
    const cleaned = cleanDomain(candidate);
    if (cleaned) {
      return cleaned;
    }
  }

  if (Array.isArray(payload.rows)) {
    for (const row of payload.rows) {
      const rowDomain = findDomain(row);
      if (rowDomain) {
        return rowDomain;
      }
    }
  }

  return null;
}

function extractRunId(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const candidates = [
    payload.runId,
    payload.run_id,
    payload.id,
    payload.workflow_run_id,
    payload.workflowRunId,
    payload.row?.runId,
    payload.row?.run_id,
    payload.data?.runId,
    payload.data?.run_id,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'string') {
      return candidate;
    }
  }
  return null;
}

module.exports = { findDomain, extractRunId, cleanDomain };
