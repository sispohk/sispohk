// --- 3B) UTIL: paging & batch ---
function _sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function fetchAllPaged(table, opts={}) {
  const {
    select='*',
    orderCol=null,
    ascending=true,
    pageSize=1000,
    label=table,
    onProgress=null,
  } = opts;

  let total = null;
  try {
    const head = await db.from(table).select('id', { count: 'exact', head: true });
    if (!head.error && typeof head.count === 'number') total = head.count;
  } catch (e) {}

  let all = [];
  let from = 0;

  while (true) {
    let q = db.from(table).select(select).range(from, from + pageSize - 1);
    if (orderCol) q = q.order(orderCol, { ascending });

    const { data, error } = await q;
    if (error) throw new Error(error.message || String(error));

    all = all.concat(data || []);
    from += (data || []).length;

    if (typeof onProgress === 'function' && total) {
      onProgress(Math.min(100, Math.round((from / total) * 100)), label);
    }

    if (!data || data.length < pageSize) break;
    await _sleep(60);
  }

  if (typeof onProgress === 'function' && total) onProgress(100, label);
  return all;
}

async function upsertSantriBatchByNIS(rawRows, opts={}) {
  const { batchSize=200, onProgress=null, label='santri', maxRetries=3 } = opts;
  if (!Array.isArray(rawRows) || rawRows.length === 0) return;

  const normalized = rawRows.map(r => normalizeSantriPayload(r)).filter(r => !!r.nis);
  const total = normalized.length;
  let done = 0;

  for (let i = 0; i < normalized.length; i += batchSize) {
    const batch = normalized.slice(i, i + batchSize);

    let attempt = 0;
    while (true) {
      try {
        const res = await db.from('santri').upsert(batch, { onConflict: 'nis' });
        if (res.error) throw new Error(res.error.message || String(res.error));
        break;
      } catch (e) {
        attempt += 1;
        const msg = (e && e.message) ? e.message : String(e);
        const transient = /429|too many|rate|timeout|gateway|503|502/i.test(msg);
        if (attempt <= maxRetries && transient) {
          await _sleep(300 * attempt);
          continue;
        }
        throw e;
      }
    }

    done += batch.length;
    if (typeof onProgress === 'function') {
      onProgress(Math.min(100, Math.round((done / total) * 100)), label);
    }
    await _sleep(60);
  }

  if (typeof onProgress === 'function') onProgress(100, label);
}
