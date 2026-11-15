'use client';

import { useEffect, useRef, useState } from 'react';
import { RULES } from '@/lib/rules';

const MAX_ATTEMPTS = 3; // first try + 2 self-corrections, then escalate to a human

const DEMOS = {
  afternoon: {
    label: 'Afternoon launch',
    brief: {
      brandName: 'taf Cold Brew',
      market: 'Athens, Greece',
      objective: 'Launch our new canned cold brew and make it the default afternoon coffee for young Athenians this spring.',
      audience: 'Urban 25–35-year-olds in Athens who drink coffee out every day and care how things look.',
      colors: 'white, red #D7262E, orange #E9772B, light blue #A9C4E2',
    },
    protectedNames: '',
  },
  gamelaunch: {
    label: 'Game launch week',
    brief: {
      brandName: 'taf Cold Brew',
      market: 'Athens, Greece',
      objective: 'Make taf Cold Brew the drink of launch week for the biggest video game release of the year (November 19). Drive sales in Athens convenience stores and delivery apps during the first two weeks, when players stay up late for long sessions.',
      audience: 'Urban 25–35-year-olds in Athens who drink coffee every day and are counting down to the biggest game launch of the year. They plan late-night sessions with friends, want to stay sharp without energy-drink jitters, and care how things look.',
      colors: 'white, red #D7262E, orange #E9772B, light blue #A9C4E2',
    },
    protectedNames: 'GTA, GTA 6, GTA VI, Grand Theft Auto, Rockstar Games, Vice City, Leonida, Jason, Lucia',
  },
};

const EMPTY_BRIEF = { brandName: '', market: '', objective: '', audience: '', colors: '', productUrl: '' };

const FORMATS = [
  { key: 'hero', name: 'Hero image', ratio: '4:5', aspect: '4 / 5' },
  { key: 'vertical', name: 'Stories and reels', ratio: '9:16', aspect: '9 / 16' },
  { key: 'wide', name: 'Web banner', ratio: '16:9', aspect: '16 / 9' },
  { key: 'video', name: 'Video spot', ratio: 'motion', aspect: '9 / 16' },
];

const RULE_NAMES = Object.fromEntries(RULES.map((r) => [r.id, r.name]));
const FIELD_NAMES = {
  headline: 'English headline', headline_el: 'Greek headline', captions: 'English captions', captions_el: 'Greek captions',
  hero_prompt: 'Hero prompt', vertical_prompt: '9:16 prompt', wide_prompt: '16:9 prompt', video_prompt: 'Video prompt',
};

const emptyAssets = () => Object.fromEntries(FORMATS.map((f) => [f.key, { status: 'idle', attempts: [] }]));

async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request to ${path} failed with status ${res.status}.`);
  return data;
}

const formatClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const show = (v) => (Array.isArray(v) ? v.join(' / ') : v);

export default function Page() {
  const [brief, setBrief] = useState(EMPTY_BRIEF);
  const [enabledRules, setEnabledRules] = useState(RULES.map((r) => r.id));
  const [protectedNames, setProtectedNames] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(null); // 'strategy' | 'plan' | 'preflight'
  const [error, setError] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [plan, setPlan] = useState(null);
  const [preflight, setPreflight] = useState(null);
  const [assets, setAssets] = useState(emptyAssets);
  const [startedAt, setStartedAt] = useState(null);
  const [finishedAt, setFinishedAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const ctx = useRef({});
  useEffect(() => { ctx.current = { brief, strategy, enabledRules, protectedNames, assets }; });

  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt, finishedAt]);

  useEffect(() => {
    if (startedAt && !finishedAt && FORMATS.every((f) => assets[f.key].status === 'done')) setFinishedAt(Date.now());
  }, [assets, startedAt, finishedAt]);

  const setAsset = (key, patch) => setAssets((a) => ({ ...a, [key]: { ...a[key], ...patch } }));
  const update = (field) => (e) => setBrief((b) => ({ ...b, [field]: e.target.value }));
  const toggleRule = (id) => setEnabledRules((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]));

  function fillDemo(key) {
    const d = DEMOS[key];
    setBrief((b) => ({ ...d.brief, productUrl: b.productUrl }));
    setProtectedNames(d.protectedNames);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBrief((b) => ({ ...b, productUrl: data.url }));
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    }
    setUploading(false);
  }

  // Generate, check against the rules, repair the prompt and retry; escalate after MAX_ATTEMPTS.
  async function produceImage(key, basePrompt, refs, ratio) {
    const { brief: b, strategy: s, enabledRules: rules, protectedNames: names } = ctx.current;
    let prompt = basePrompt;
    const attempts = [];
    setAsset(key, { status: 'running', phase: 'Generating…', attempts: [], check: null, url: null, error: null, review: false });

    for (let n = 1; n <= MAX_ATTEMPTS; n++) {
      let img;
      try {
        img = await post('/api/image', { prompt, imageUrls: refs, aspectRatio: ratio });
      } catch (err) {
        setAsset(key, { status: 'error', error: err.message, phase: null });
        return null;
      }
      setAsset(key, { url: img.url, ms: img.ms, phase: 'Checking against the rules…' });

      let check;
      try {
        check = await post('/api/check', {
          assetUrl: img.url, productUrl: b.productUrl, identityElements: s?.identity_elements || [], enabledRules: rules, protectedNames: names,
        });
      } catch (err) {
        check = { pass: false, results: [], note: `The check could not run: ${err.message}`, broken: true };
      }

      const attempt = { n, prompt, url: img.url, ms: img.ms, pass: check.pass, results: check.results, note: check.note };
      attempts.push(attempt);
      setAsset(key, { attempts: [...attempts], check });

      if (check.pass || check.broken || n === MAX_ATTEMPTS) {
        setAsset(key, { status: 'done', phase: null, review: !check.pass });
        return img.url;
      }

      setAsset(key, { phase: `Drift found. Repairing the prompt (attempt ${n + 1} of ${MAX_ATTEMPTS})…` });
      try {
        const fix = await post('/api/fix', {
          prompt, failures: check.results.filter((r) => !r.pass), identityElements: s?.identity_elements || [],
        });
        attempt.repair = fix.reason;
        prompt = fix.prompt;
        setAsset(key, { attempts: [...attempts], phase: `Regenerating (attempt ${n + 1} of ${MAX_ATTEMPTS})…` });
      } catch (err) {
        setAsset(key, { status: 'done', phase: null, review: true });
        return img.url;
      }
    }
  }

  async function produceVideo(prompt, imageUrl) {
    setAsset('video', { status: 'running', phase: 'Rendering video…', error: null, url: null });
    try {
      const r = await post('/api/video', { prompt, imageUrl });
      setAsset('video', { status: 'done', url: r.url, ms: r.ms, phase: null });
    } catch (err) {
      setAsset('video', { status: 'error', error: err.message, phase: null });
    }
  }

  async function runProduction(p) {
    const product = ctx.current.brief.productUrl;
    const hero = await produceImage('hero', p.hero_prompt, [product], '4:5');
    if (!hero) return;
    await Promise.all([
      produceImage('vertical', p.vertical_prompt, [hero, product], '9:16').then((v) => v && produceVideo(p.video_prompt, v)),
      produceImage('wide', p.wide_prompt, [hero, product], '16:9'),
    ]);
  }

  async function regenerate(key) {
    if (!plan) return;
    const product = brief.productUrl;
    const heroUrl = ctx.current.assets.hero.url;
    setFinishedAt(null);
    if (key === 'hero') return produceImage('hero', plan.hero_prompt, [product], '4:5');
    if (key === 'vertical') return produceImage('vertical', plan.vertical_prompt, [heroUrl, product], '9:16');
    if (key === 'wide') return produceImage('wide', plan.wide_prompt, [heroUrl, product], '16:9');
    if (key === 'video' && ctx.current.assets.vertical.url) return produceVideo(plan.video_prompt, ctx.current.assets.vertical.url);
  }

  async function generateStrategy() {
    setError(null);
    setBusy('strategy');
    setStrategy(null); setChosen(null); setPlan(null); setPreflight(null);
    setAssets(emptyAssets());
    setStartedAt(Date.now()); setFinishedAt(null);
    try {
      setStrategy(await post('/api/strategy', brief));
    } catch (err) {
      setError(`Strategy failed: ${err.message}`);
      setStartedAt(null);
    }
    setBusy(null);
  }

  async function chooseConcept(i) {
    setChosen(i); setError(null);
    setPlan(null); setPreflight(null);
    setAssets(emptyAssets()); setFinishedAt(null);
    try {
      setBusy('plan');
      const raw = await post('/api/plan', { brief, strategy, conceptIndex: i });
      setBusy('preflight');
      const pf = await post('/api/preflight', { plan: raw, strategy, brief, enabledRules, protectedNames });
      setPreflight(pf);
      setPlan(pf.plan);
      setBusy(null);
      runProduction(pf.plan);
    } catch (err) {
      setError(`Planning failed: ${err.message}`);
      setBusy(null);
    }
  }

  function exportAudit() {
    const audit = {
      exported_at: new Date().toISOString(),
      ai_generated: true,
      disclosure: 'All images and video in this campaign were generated with AI models.',
      brief, protected_names: protectedNames,
      rules: RULES.filter((r) => enabledRules.includes(r.id)),
      strategy, chosen_concept: strategy?.concepts?.[chosen],
      preflight: preflight?.rounds, final_plan: plan,
      assets: Object.fromEntries(FORMATS.map((f) => [f.key, {
        url: assets[f.key].url || null, needs_human_review: Boolean(assets[f.key].review), attempts: assets[f.key].attempts || [],
      }])),
      brief_to_campaign_seconds: finishedAt && startedAt ? Math.round((finishedAt - startedAt) / 1000) : null,
    };
    const blob = new Blob([JSON.stringify(audit, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${(brief.brandName || 'campaign').replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const ready = brief.brandName && brief.objective && brief.audience && brief.productUrl;
  const elapsed = startedAt ? (finishedAt || now) - startedAt : 0;
  const allAttempts = FORMATS.flatMap((f) => assets[f.key].attempts || []);
  const corrections = allAttempts.filter((a) => a.n > 1).length + (preflight ? preflight.rounds.length - 1 : 0);
  const reviews = FORMATS.filter((f) => assets[f.key].review).length;

  return (
    <div className="shell">
      <header className="topbar">
        <p className="wordmark">Campaign Engine</p>
        {startedAt && (
          <p className={`clock ${finishedAt ? 'is-final' : ''}`} aria-live="polite">
            {finishedAt ? `Brief to campaign in ${formatClock(elapsed)}` : formatClock(elapsed)}
          </p>
        )}
      </header>

      <main className="layout">
        <aside className="rail">
          <section className="panel" aria-labelledby="brief-title">
            <div className="panel-head">
              <h2 id="brief-title">Brief</h2>
              <div className="demo-links">
                {Object.entries(DEMOS).map(([k, d]) => (
                  <button key={k} type="button" className="link-button" onClick={() => fillDemo(k)}>{d.label}</button>
                ))}
              </div>
            </div>

            <label className="field"><span>Brand</span>
              <input value={brief.brandName} onChange={update('brandName')} placeholder="taf Cold Brew" /></label>
            <label className="field"><span>Market</span>
              <input value={brief.market} onChange={update('market')} placeholder="Athens, Greece" /></label>
            <label className="field"><span>Business objective</span>
              <textarea rows={3} value={brief.objective} onChange={update('objective')} placeholder="What should this campaign achieve?" /></label>
            <label className="field"><span>Audience</span>
              <textarea rows={2} value={brief.audience} onChange={update('audience')} placeholder="Who are we talking to?" /></label>
            <label className="field"><span>Brand colors</span>
              <input value={brief.colors} onChange={update('colors')} placeholder="white, red #D7262E, light blue #A9C4E2" /></label>

            <div className="field">
              <span>Product photo</span>
              <div className="product-row">
                {brief.productUrl
                  ? <img className="product-thumb" src={brief.productUrl} alt="Product photo" />
                  : <div className="product-thumb is-empty" aria-hidden="true" />}
                <div className="product-inputs">
                  <label className="file-button">
                    {uploading ? 'Uploading…' : brief.productUrl ? 'Replace photo' : 'Upload photo'}
                    <input type="file" accept="image/*" onChange={onFile} disabled={uploading} />
                  </label>
                  <input aria-label="Or paste an image URL" value={brief.productUrl} onChange={update('productUrl')} placeholder="or paste an image URL" />
                </div>
              </div>
            </div>
          </section>

          <section className="panel" aria-labelledby="rules-title">
            <h2 id="rules-title">Brand guardian</h2>
            <p className="hint">The creative agents never see these rules. A separate reviewer enforces them on the plan and on every asset.</p>
            {['Brand', 'Legal', 'Channel'].map((g) => (
              <fieldset key={g} className="rule-group">
                <legend>{g}</legend>
                {RULES.filter((r) => r.group === g).map((r) => (
                  <label key={r.id} className="rule">
                    <input type="checkbox" checked={enabledRules.includes(r.id)} onChange={() => toggleRule(r.id)} />
                    <span><strong>{r.name}</strong><br /><span className="rule-text">{r.text}</span></span>
                  </label>
                ))}
              </fieldset>
            ))}
            <label className="field"><span>Protected names (never in words or images)</span>
              <textarea rows={2} value={protectedNames} onChange={(e) => setProtectedNames(e.target.value)} placeholder="Other brands, games, films, comma-separated" /></label>

            <button type="button" className="primary" onClick={generateStrategy} disabled={!ready || busy === 'strategy'}>
              {busy === 'strategy' ? 'Writing strategy…' : 'Generate strategy'}
            </button>
            {!ready && <p className="hint">Brand, objective, audience and a product photo are needed to start.</p>}
          </section>

          {strategy && (
            <section className="panel" aria-labelledby="strategy-title">
              <h2 id="strategy-title">Strategy</h2>
              <dl className="strategy">
                <dt>Insight</dt><dd>{strategy.insight}</dd>
                <dt>Key message</dt><dd>{strategy.key_message}</dd>
              </dl>
              <div className="concepts">
                {strategy.concepts?.map((c, i) => (
                  <article key={i} className={`concept ${chosen === i ? 'is-chosen' : ''}`}>
                    <h3>{c.name}</h3>
                    <p>{c.idea}</p>
                    <p className="concept-visual">{c.visual_direction}</p>
                    <button type="button" onClick={() => chooseConcept(i)} disabled={Boolean(busy)}>
                      {chosen === i && busy === 'plan' ? 'Planning shots…'
                        : chosen === i && busy === 'preflight' ? 'Checking the plan…'
                        : chosen === i ? 'Produce again' : 'Produce this concept'}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {error && <p className="error" role="alert">{error}</p>}
        </aside>

        <section className="board" aria-labelledby="board-title">
          {!plan ? (
            <div className="board-empty">
              <h1 id="board-title">One brief in.<br />A whole campaign out.</h1>
              <p>
                {busy === 'preflight'
                  ? 'The brand guardian is checking the plan against your rules before anything is generated.'
                  : 'Fill the brief, set the guardrails and generate a strategy. Pick a concept and the campaign builds itself here, every asset checked against your product and your rules.'}
              </p>
            </div>
          ) : (
            <>
              <div className="board-head">
                <div className="board-bar">
                  <p className="board-meta">
                    {brief.brandName}, concept: {strategy?.concepts?.[chosen]?.name}. {corrections} automatic correction{corrections === 1 ? '' : 's'}
                    {reviews ? `, ${reviews} asset${reviews === 1 ? '' : 's'} need human review` : ''}.
                  </p>
                  <button type="button" className="link-button" onClick={exportAudit}>Export audit trail</button>
                </div>
                <h1 id="board-title" className="headline">{plan.headline}</h1>
                {plan.headline_el && <p className="headline-el" lang="el">{plan.headline_el}</p>}
                <ul className="captions">
                  {plan.captions?.map((c, i) => (
                    <li key={i}>{c}{plan.captions_el?.[i] && <span lang="el" className="caption-el">{plan.captions_el[i]}</span>}</li>
                  ))}
                </ul>
              </div>

              {preflight && <Preflight data={preflight} />}

              <div className="frames">
                {FORMATS.map((f) => (
                  <Frame key={f.key} format={f} asset={assets[f.key]} onRegenerate={() => regenerate(f.key)} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function RuleResults({ results }) {
  if (!results?.length) return null;
  return (
    <ul className="results">
      {results.map((r) => (
        <li key={r.id} className={r.pass ? 'ok' : 'bad'}>
          <span aria-hidden="true">{r.pass ? '✓' : '✕'}</span> {RULE_NAMES[r.id] || r.id}
          {!r.pass && <span className="result-note">{r.note}</span>}
        </li>
      ))}
    </ul>
  );
}

function Preflight({ data }) {
  const first = data.rounds[0];
  const caught = first.results.filter((r) => !r.pass);
  const changes = data.rounds.flatMap((r) => r.changes);
  const copyChanges = changes.filter((c) => !c.field.endsWith('_prompt'));
  const promptChanges = changes.filter((c) => c.field.endsWith('_prompt'));
  return (
    <section className={`preflight ${data.pass ? 'is-pass' : 'is-flag'}`} aria-labelledby="preflight-title">
      <h2 id="preflight-title">
        {caught.length === 0 ? 'Plan passed every rule before production'
          : data.pass ? `Plan fixed before production: ${caught.length} rule${caught.length === 1 ? '' : 's'} caught`
          : 'Plan still breaks a rule: review before publishing'}
      </h2>
      <RuleResults results={first.results} />
      {copyChanges.length > 0 && (
        <div className="changes">
          {copyChanges.map((c, i) => (
            <div key={i} className="change">
              <p className="change-field">{FIELD_NAMES[c.field] || c.field}</p>
              <p className="before"><del>{show(c.before)}</del></p>
              <p className="after">{show(c.after)}</p>
            </div>
          ))}
        </div>
      )}
      {promptChanges.length > 0 && (
        <p className="hint">Also rewritten: {promptChanges.map((c) => FIELD_NAMES[c.field]).join(', ')}.</p>
      )}
      {!data.pass && <RuleResults results={data.rounds[data.rounds.length - 1].results.filter((r) => !r.pass)} />}
    </section>
  );
}

function Frame({ format, asset, onRegenerate }) {
  const isVideo = format.key === 'video';
  const busy = asset.status === 'running';
  return (
    <figure className={`frame frame-${format.key}`}>
      <div className="frame-media" style={asset.url ? undefined : { aspectRatio: format.aspect }}>
        <span className="crop tl" /><span className="crop tr" /><span className="crop bl" /><span className="crop br" />
        {asset.url && isVideo && <video src={asset.url} controls loop muted autoPlay playsInline />}
        {asset.url && !isVideo && <img src={asset.url} alt={`${format.name} for the campaign`} className={busy ? 'is-stale' : ''} />}
        {(busy || !asset.url) && (
          <p className={`frame-state ${asset.url ? 'is-overlay' : ''}`}>
            {busy && asset.phase}
            {asset.status === 'idle' && (isVideo ? 'Waits for the 9:16 image' : 'Queued')}
            {asset.status === 'error' && 'Generation failed'}
          </p>
        )}
      </div>

      <figcaption>
        <div className="frame-title">
          <strong>{format.name}</strong>
          <span>{format.ratio}{asset.ms ? `, ${(asset.ms / 1000).toFixed(1)} s` : ''}</span>
        </div>

        {asset.status === 'error' && <p className="frame-error">{asset.error}</p>}

        {!isVideo && asset.status === 'done' && (
          asset.review
            ? <p className="verdict is-flag">Needs human review: {asset.check?.note}</p>
            : <p className="verdict is-pass">{asset.attempts.length > 1 ? `On brand after ${asset.attempts.length - 1} correction${asset.attempts.length > 2 ? 's' : ''}` : 'On brand, first try'}</p>
        )}
        {!isVideo && asset.check?.results && <RuleResults results={asset.check.results} />}
        {isVideo && asset.status === 'done' && <p className="check-note">Made from the approved 9:16 image. Check motion by eye before export.</p>}

        {asset.attempts?.length > 1 && (
          <details className="audit">
            <summary>Audit trail: {asset.attempts.length} attempts</summary>
            <ol>
              {asset.attempts.map((a) => (
                <li key={a.n}>
                  <img src={a.url} alt={`Attempt ${a.n}`} />
                  <div>
                    <p><strong>Attempt {a.n}</strong>: {a.pass ? 'passed' : 'failed'}. {a.pass ? '' : a.note}</p>
                    {a.repair && <p className="check-note">Repair: {a.repair}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </details>
        )}

        <div className="frame-actions">
          {(asset.status === 'done' || asset.status === 'error') && <button type="button" onClick={onRegenerate}>Regenerate</button>}
          {asset.url && !busy && <a href={asset.url} target="_blank" rel="noreferrer">Open file</a>}
        </div>
      </figcaption>
    </figure>
  );
}
