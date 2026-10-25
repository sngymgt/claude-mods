import type { Register } from 'claude-code'

const WINDOW_MS: Record<string, number> = {
  five_hour: 5 * 3600_000,
  seven_day: 7 * 86400_000,
}
const CELLS = 5

const remaining = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000))
  if (m >= 1440) return `${Math.floor(m / 1440)}d${Math.floor((m % 1440) / 60)}h`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

// elapsed が null のバーには時間の目印を出さない（Context 用）
const bar = (label: string, used: number, elapsed: number | null, detail: string) => {
  const filled = Math.round((Math.min(used, 100) / 100) * CELLS)
  const mark = elapsed === null ? -1 : Math.min(CELLS - 1, Math.round(elapsed * CELLS))
  let cells = ''
  for (let i = 0; i < CELLS; i++) {
    cells += i === mark ? '│' : i < filled ? '▇' : '▁'
  }
  return `${label} ${cells} ${detail}`
}

async function refresh($: any) {
  const usage = await $.session.usage()
  const now = await $.clock.now()
  const parts: string[] = []

  const ctx = usage.context.percent
  if (ctx !== undefined) parts.push(bar('Ctx', ctx, null, `${Math.round(ctx)}%`))

  for (const kind of ['five_hour', 'seven_day']) {
    const r = usage.rateLimits.find((x: any) => x.kind === kind)
    if (!r) continue
    let elapsed: number | null = null
    let detail = `${Math.round(r.percentUsed)}%`
    if (r.resetsAt) {
      const left = Date.parse(r.resetsAt) - now
      elapsed = Math.min(1, Math.max(0, 1 - left / WINDOW_MS[kind]))
      detail += ` ${remaining(left)}`
    }
    parts.push(bar(kind === 'five_hour' ? '5h' : '1w', r.percentUsed, elapsed, detail))
  }

  $.ui.status(parts.length ? parts.join("  ") : undefined)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await refresh($)
    return next(e)
  })
}
