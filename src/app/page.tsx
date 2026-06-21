const sampleSql = `CREATE TABLE app.users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

export default function Home() {
  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">
            Visualize PostgreSQL DDL as an interactive ERD.
          </p>
          <h1>Erdium</h1>
        </div>
        <nav aria-label="Workspace actions" className="toolbar">
          <button type="button" disabled>
            Parse
          </button>
          <button type="button" disabled>
            Import
          </button>
          <button type="button" disabled>
            Export
          </button>
        </nav>
      </header>

      <div className="workspace-grid">
        <section className="panel sql-panel" aria-labelledby="sql-source-title">
          <div className="panel-heading">
            <h2 id="sql-source-title">SQL source</h2>
            <span>PostgreSQL</span>
          </div>
          <label className="visually-hidden" htmlFor="sql-source">
            SQL source
          </label>
          <textarea
            id="sql-source"
            spellCheck={false}
            defaultValue={sampleSql}
          />
        </section>

        <section
          className="panel diagram-panel"
          aria-labelledby="diagram-title"
        >
          <div className="panel-heading">
            <h2 id="diagram-title">Diagram</h2>
            <span>Canvas</span>
          </div>
          <div
            className="diagram-surface"
            role="img"
            aria-label="Empty Erdium diagram canvas"
          >
            <div className="table-preview" aria-hidden="true">
              <div className="table-preview-title">app.users</div>
              <div>id BIGSERIAL PK</div>
              <div>email VARCHAR(255) UNIQUE</div>
              <div>created_at TIMESTAMPTZ</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
