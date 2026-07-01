# Erdium Learning Log

## Milestone 1: Application Scaffold

### Completed Work

- Next.js App Router 기반의 초기 애플리케이션 구조 완성
- TypeScript strict mode, ESLint, Vitest, Playwright 설정
- 문서와 초기 화면에 제품명 Erdium 반영
- 최소 접근성 기준을 가진 SQL editor/diagram scaffold 화면 제작

### Concepts To Review

- App Router에서 layout.tsx와 page.tsx의 역할
- Server Component와 Client Component의 차이
- package.json scripts가 실제로 실행하는 작업
- Vitest와 Playwright의 테스트 범위 차이
- role/name 기반 접근성 selector

### Code To Revisit

- src/app/layout.tsx: root layout 구조 확인
- src/app/page.tsx: 현재 화면이 Server Component로 가능한 이유 확인
- package.json: 각 script가 어떤 검증을 담당하는지 정리
- tests/e2e/home.spec.ts: Playwright selector가 UI 구조와 어떻게 연결되는지 확인

### Portfolio Notes

- 프로젝트 초기부터 lint, typecheck, unit test, E2E test, build를 통과하는 구조로 시작
- UI 구현보다 먼저 검증 가능한 개발 환경
- Phase 1 범위를 지키기 위해 parser, React Flow, ELK, auth, AI는 아직 추가하지 않음

### Interview Notes

- “왜 Next.js를 선택했나요?”
- “왜 첫 단계에서 parser부터 만들지 않았나요?”
- “Vitest와 Playwright를 둘 다 둔 이유는 무엇인가요?”
- “Server Component와 Client Component를 어떻게 구분할 계획인가요?”

### Open Questions

- Next.js에서 언제 `"use client"`를 붙여야 하는가?
- 지금 화면은 왜 Client Component가 아니어도 되는가?
- Playwright E2E는 어느 정도까지 작성하는 것이 적절한가?

### Next Milestone Preparation

- TypeScript interface/type alias 복습
- discriminated union 개념 학습
- stable identifier 설계 방식 이해
- PostgreSQL identifier normalization 규칙 확인

## Milestone 2: Canonical Schema Model

### Completed Work

- `DatabaseSchema`를 중심으로 table, column, key constraint, foreign key domain type 정의
- parser/UI/vendor에 의존하지 않는 schema domain public export 추가
- PostgreSQL identifier normalization 및 stable ID 생성 helper 추가
- parser/normalization diagnostic type과 parse result contract 정의
- identifier, model, diagnostic behavior에 대한 Vitest unit test 추가

### Concepts To Review

- TypeScript `interface`와 `type`을 구분해서 사용하는 기준
- `as const`로 literal union type을 만드는 방식
- `import type`이 runtime import를 만들지 않는 이유
- PostgreSQL unquoted/quoted identifier normalization 규칙
- stable ID가 array index나 단순 문자열 결합보다 중요한 이유
- unit test에서 snapshot보다 named assertion을 우선하는 이유

### Code To Revisit

- `src/domain/schema/model.ts`: canonical schema model의 필드와 composite key 순서 보존 확인
- `src/domain/schema/identifiers.ts`: quoted identifier 처리와 length-prefixed stable ID 생성 방식 확인
- `src/domain/schema/diagnostics.ts`: success/failure parse result가 discriminated union으로 표현되는 방식 확인
- `src/domain/schema/*.test.ts`: domain contract를 어떤 behavior 단위로 검증했는지 확인

### Portfolio Notes

- parser library를 선택하기 전에 application-owned domain model을 먼저 정의
- PostgreSQL AST, React, Next.js, React Flow, ELK에 의존하지 않는 순수 TypeScript domain layer 구성
- identifier collision을 피하기 위해 dot concatenation 대신 length-prefixed stable ID 전략 사용
- composite primary key, unique key, foreign key를 ordered column ID 배열로 표현할 수 있게 설계
- diagnostics와 parse result contract를 먼저 정의해 이후 parser adapter와 UI error flow의 기준 마련

### Interview Notes

- “왜 parser library AST를 그대로 쓰지 않고 별도 domain model을 정의했나요?”
- “stable identifier는 왜 필요한가요?”
- “PostgreSQL identifier normalization에서 quoted와 unquoted는 어떻게 다르게 처리하나요?”
- “composite key를 왜 하나의 relation/constraint로 유지해야 하나요?”
- “TypeScript discriminated union을 parse result에 사용한 이유는 무엇인가요?”
- “이 domain layer가 framework-independent하다는 것을 어떻게 보장했나요?”

### Open Questions

- parser adapter에서 parser AST의 source location을 `SourceRange`로 어떻게 매핑할 것인가?
- anonymous constraint ID를 parser statement 순서 없이 완전히 deterministic하게 만들려면 어떤 descriptor가 필요한가?
- quoted identifier fixture는 parser spike 단계에서 어느 후보가 가장 정확하게 제공하는가?
- type text와 default expression을 어느 수준까지 lossless하게 보존할 수 있는가?

### Next Milestone Preparation

- PostgreSQL parser 후보의 browser compatibility, license, bundle size 확인
- `CREATE TABLE`과 `ALTER TABLE ... ADD CONSTRAINT` AST shape 비교 방법 정리
- fixture 단위로 parser 후보를 평가하는 spike 문서 형식 준비
- source range, quoted identifier, schema-qualified identifier 지원 여부를 parser 후보 평가 기준에 포함

## Milestone 3: Parser Library Spike

### Completed Work

- PostgreSQL parser 후보를 production 코드와 분리된 spike workspace에서 비교
- `pgsql-ast-parser@12.0.2`와 `pgsql-parser@17.9.15`를 세 fixture와 quoted identifier probe로 실험
- parser 후보별 AST shape, source location, foreign key, referential action, type/default 표현 방식 확인
- Phase 1 Milestone 4 parser adapter 후보로 `pgsql-ast-parser` 추천
- `docs/parser-spike.md`에 후보 제외 사유, fixture 결과, recommendation, risks 기록

### Concepts To Review

- spike의 목적: production 구현 전에 기술 선택 위험을 줄이는 짧은 실험
- parser library AST와 application-owned domain model을 분리해야 하는 이유
- PostgreSQL DDL에서 inline constraint와 table-level constraint가 AST에서 다르게 표현되는 방식
- `ALTER TABLE ... ADD CONSTRAINT`가 table declaration 이후 별도 resolution pass가 필요한 이유
- byte offset source location을 1-based line/column diagnostic으로 변환하는 방식
- WASM 기반 parser와 plain JavaScript parser의 browser integration tradeoff
- 기술 선택 근거를 scorecard와 decision flow로 설명하는 방식
- PostgreSQL 전용 선택과 future multi-dialect 확장 계획을 분리해서 문서화하는 방식

### Code To Revisit

- `spikes/parser-library/inspect.mjs`: 후보 parser를 동일 입력으로 비교하는 격리 실험 구조 확인
- `spikes/parser-library/package.json`: 루트 앱 의존성과 spike 의존성을 분리한 방식 확인
- `docs/parser-spike.md`: 후보별 AST 관찰과 recommendation이 어떤 근거로 작성됐는지 확인
- `fixtures/postgres/*.sql`: parser adapter가 만족해야 할 executable specification으로 다시 읽기

### Portfolio Notes

- 의존성을 바로 추가하지 않고 후보 parser를 fixture 기준으로 검증한 의사결정 과정
- 브라우저 local-first 요구사항을 기술 선택 기준에 포함
- parser 정확도뿐 아니라 adapter 복잡도, source location, bundle/init cost, license를 함께 평가
- production 코드에 vendor AST type을 유입시키지 않는 architecture boundary 유지
- 추천 후보와 fallback 후보를 명확히 남겨 향후 parser 교체 가능성을 보존
- Phase 1 parser 선택이 future DBMS parser 선택을 고정하지 않도록 dialect adapter 전략을 문서화

### Interview Notes

- “왜 parser library를 바로 선택하지 않고 spike를 진행했나요?”
- “`pgsql-ast-parser`를 추천한 핵심 근거는 무엇인가요?”
- “`pgsql-parser`처럼 PostgreSQL 실제 parser에 가까운 후보를 선택하지 않은 이유는 무엇인가요?”
- “source location이 diagnostics에 왜 중요한가요?”
- “vendor AST type이 domain model로 새어 나오면 어떤 문제가 생기나요?”
- “기술 선택 spike의 결과를 포트폴리오에서 어떻게 설명할 수 있나요?”
- “PostgreSQL 이후 MySQL이나 SQLite를 지원하려면 현재 구조에서 무엇을 추가해야 하나요?”
- “왜 지금 `SqlDialect`를 여러 DBMS union으로 넓히지 않았나요?”

### Open Questions

- parse error에서 `pgsql-ast-parser`가 제공하는 error position을 `SourceRange`로 얼마나 정확히 매핑할 수 있는가?
- `pgsql-ast-parser`가 향후 array type, custom type, identity column fixture를 어디까지 처리할 수 있는가?
- type/default display text는 AST 재구성보다 source slicing을 우선할 것인가?
- unsupported statement를 parser error와 normalization diagnostic 중 어느 단계에서 구분할 것인가?
- MySQL, SQLite 등 future dialect마다 identifier normalization, default expression, type display text 차이를 어디까지 `DatabaseSchema`에 반영해야 하는가?
- future dialect 추가 시 공통 parse contract만 재사용하고 coverage 문서는 dialect별로 분리하는 것이 충분한가?

### Next Milestone Preparation

- `pgsql-ast-parser`를 production dependency로 추가할 때 runtime dependency로 분류할 이유 정리
- `src/adapters/parser/postgres` 경계와 public parse function 이름 결정
- `basic.sql` fixture를 `DatabaseSchema`로 normalize하는 최소 adapter flow 설계
- offset 기반 source location을 line/column으로 변환하는 helper 설계
- parser AST type이 adapter 밖으로 export되지 않도록 test 또는 import boundary 점검

## Milestone 4: Basic Parser Adapter

### Completed Work

- `pgsql-ast-parser@12.0.2`를 Phase 1 PostgreSQL parser runtime dependency로 추가
- `parsePostgresSql` adapter를 추가해 `basic.sql`을 `DatabaseSchema`로 normalize
- `CREATE TABLE`의 table, column, primary key, unique, nullability, type, default expression 처리 구현
- parser syntax error, duplicate table/column, unsupported foreign-key feature에 대한 diagnostic 경로 추가
- `basic.sql` fixture와 error path에 대한 adapter-level Vitest test 추가

### Concepts To Review

- parser adapter가 vendor AST를 application-owned domain model로 변환하는 역할
- source offset을 1-based line/column `SourceRange`로 변환하는 방식
- source slicing과 AST-to-SQL fallback으로 displayable type/default text를 만드는 방식
- inline constraint와 table-level constraint를 같은 `KeyConstraint` model로 합치는 방식
- fixture test에서 전체 AST snapshot 대신 semantic assertion을 작성하는 방식
- unsupported feature를 silently ignore하지 않고 diagnostic으로 막는 이유

### Code To Revisit

- `src/adapters/parser/postgres/parse-postgres-sql.ts`: parser adapter boundary와 normalization flow 확인
- `src/adapters/parser/postgres/parse-postgres-sql.test.ts`: `basic.sql` contract를 어떤 assertions로 검증하는지 확인
- `src/domain/schema/identifiers.ts`: table/column/constraint ID 생성이 adapter에서 어떻게 재사용되는지 확인
- `docs/parser-coverage.md`: Milestone 4에서 의도적으로 남긴 FK/ALTER TABLE 범위 확인

### Portfolio Notes

- production code가 parser library AST에 직접 결합되지 않도록 adapter boundary 구성
- SQL을 실행하지 않고 browser-local parser dependency만 추가
- domain model을 먼저 정의한 뒤 parser 결과를 그 model로 맞추는 순서 유지
- fixture-driven development로 `basic.sql` 요구사항을 검증 가능한 테스트로 전환
- future milestone 범위인 foreign key를 조용히 무시하지 않고 diagnostic으로 차단

### Interview Notes

- “parser adapter는 왜 별도 계층으로 분리했나요?”
- “왜 vendor AST를 domain model로 그대로 사용하지 않았나요?”
- “source location은 어떻게 line/column diagnostic으로 바꾸나요?”
- “type/default expression을 표시용 문자열로 보존할 때 어떤 tradeoff가 있었나요?”
- “왜 foreign key를 아직 구현하지 않았는데 diagnostic으로 막았나요?”
- “fixture 기반 테스트가 parser 작업에서 왜 중요한가요?”

### Open Questions

- `pgsql-ast-parser`의 source location이 모든 future DDL feature에서 충분히 정확한가?
- type/default text를 source slice로 보존할 때 comments, unusual whitespace, quoted types를 어떻게 다룰 것인가?
- Milestone 5에서 inline/table-level/ALTER TABLE foreign key unresolved declarations를 어떤 내부 구조로 수집할 것인가?
- unsupported feature diagnostic을 warning으로 낮출 수 있는 기준은 무엇인가?

### Next Milestone Preparation

- inline `REFERENCES`와 table-level `FOREIGN KEY` AST shape를 unresolved FK declaration으로 수집하는 구조 설계
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`를 table collection 이후 적용하는 pass 추가 준비
- referential action 문자열을 `ReferentialAction` closed union으로 normalize하는 helper 설계
- unknown table/column, FK column-count mismatch diagnostics fixture 추가 준비

## Milestone 5: Foreign-Key Normalization

### Completed Work

- `CREATE TABLE` inline `REFERENCES`와 table-level `FOREIGN KEY`를 `ForeignKeyDefinition`으로 normalize
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY`를 table 수집 이후 적용하는 흐름 추가
- FK source/target table과 column을 stable ID로 resolution하는 pass 구현
- `ON DELETE` / `ON UPDATE` action을 domain union 값으로 normalize
- unknown table/column, column-count mismatch, unsupported ALTER에 대한 diagnostic test 추가

### Concepts To Review

- multi-pass normalization: statement 순서와 relation resolution을 분리하는 방식
- unresolved declaration: parser AST에서 바로 domain relation을 만들지 않고 임시 선언으로 수집하는 이유
- forward reference: 참조 대상 table이 뒤에 선언되어도 마지막 pass에서 해결하는 방식
- composite foreign key: 여러 column pair를 하나의 ordered relation으로 유지하는 모델링
- referential action: vendor parser 문자열을 closed union domain value로 변환하는 방식
- diagnostic-first parsing: 조용히 무시하지 않고 실패 가능한 입력을 명시적으로 막는 정책

### Code To Revisit

- `src/adapters/parser/postgres/parse-postgres-sql.ts`: table collection, ALTER collection, FK resolution pass 흐름 확인
- `src/adapters/parser/postgres/parse-postgres-sql.test.ts`: fixture 기반 FK semantic assertion 확인
- `src/domain/schema/model.ts`: `ForeignKeyDefinition`과 ordered column ID 배열 확인
- `src/domain/schema/identifiers.ts`: `createForeignKeyId`가 relation identity를 구성하는 방식 확인
- `fixtures/postgres/foreign-key.sql`, `fixtures/postgres/alter-table.sql`: FK coverage contract 확인

### Portfolio Notes

- SQL parser AST를 application-owned schema model로 변환하는 adapter boundary 유지
- table/column/constraint/FK ID를 stable identifier로 관리해 future layout persistence와 연결 가능
- forward reference와 `ALTER TABLE`을 multi-pass로 해결해 실제 DDL 입력에 가까운 흐름 지원
- FK 오류를 user-facing diagnostic으로 표현해 parser reliability와 product safety를 함께 보여줄 수 있음
- fixture comments를 실제 semantic assertions로 전환해 테스트가 문서 역할을 하도록 구성

### Interview Notes

- “왜 foreign key는 단일 pass가 아니라 multi-pass로 처리했나요?”
- “parser AST의 FK 선언과 domain `ForeignKeyDefinition`은 어떻게 다르게 설계했나요?”
- “forward reference와 `ALTER TABLE` FK는 어떻게 해결하나요?”
- “composite foreign key에서 column order가 왜 중요한가요?”
- “referential action을 string 그대로 두지 않고 union으로 normalize한 이유는 무엇인가요?”
- “unsupported ALTER operation을 왜 무시하지 않고 diagnostic으로 처리했나요?”

### Open Questions

- quoted identifier가 FK source/target column resolution에서 충분히 보존되는지 별도 fixture가 필요한가?
- `REFERENCES table`처럼 target column이 생략된 PostgreSQL syntax를 Phase 1에서 지원할지, 계속 제외할지 결정 필요
- named constraint collision을 ID collision 기준만으로 볼지, DB처럼 table scope name uniqueness도 검증할지 결정 필요
- future MySQL/SQLite adapter에서 FK action과 identifier normalization 차이를 domain model이 충분히 흡수할 수 있는지 확인 필요

### Next Milestone Preparation

- hard-coded `DatabaseSchema` 또는 parser output을 diagram graph model로 변환하는 slice 준비
- `ForeignKeyDefinition`을 diagram edge로 매핑할 때 composite FK를 하나의 edge로 유지하는 기준 정리
- React Flow 도입 전 vendor-neutral graph type과 adapter boundary를 먼저 설계
- table/column display metadata와 relation metadata 중 diagram node/edge에 필요한 최소 정보 결정

## Milestone 6: Hard-Coded Diagram Vertical Slice

### Completed Work

- `@xyflow/react`를 runtime dependency로 추가하고 root layout에서 React Flow stylesheet 로드
- hard-coded `DatabaseSchema`를 3-table ERD로 렌더링하는 vertical slice 구현
- `DatabaseSchema`를 vendor-neutral `DiagramGraph`로 변환하는 pure mapper 추가
- React Flow node/edge 변환을 presentation adapter 경계 안으로 격리
- custom table node에서 PK/FK/UQ/NN/DEF column metadata 표시
- React Flow node state를 `useNodesState`로 관리해 in-memory table drag 지원
- Playwright scaffold test를 실제 diagram table/edge 렌더링과 node drag 확인으로 확장

### Concepts To Review

- vendor-neutral graph boundary: domain schema와 React Flow objects를 직접 결합하지 않는 이유
- custom node type: table rendering을 React Flow adapter 안에서 구성하는 방식
- controlled React Flow: nodes/edges를 명시적으로 전달하고 connection creation은 비활성화하는 방식
- `onNodesChange`: controlled nodes에서 drag/selection changes를 local state에 반영하는 방식
- manual positions: ELK 도입 전 deterministic positions로 vertical slice를 검증하는 기준
- client boundary: `app/page.tsx`는 server entry로 유지하고 interactive diagram만 client component로 분리하는 방식

### Code To Revisit

- `src/features/diagram/graph/schema-to-diagram-graph.ts`: schema-to-graph mapping과 FK edge semantics 확인
- `src/features/diagram/react-flow/to-react-flow-elements.ts`: React Flow node/edge object 변환 확인
- `src/features/diagram/components/schema-diagram.tsx`: React Flow boundary와 interaction props 확인
- `src/features/diagram/components/table-node.tsx`: table/column metadata rendering 확인
- `src/features/diagram/sample-schema.ts`: Milestone 6 hard-coded schema source 확인

### Portfolio Notes

- parser output과 UI library 사이에 graph boundary를 둬 future layout/persistence 작업을 분리하기 쉬움
- composite FK를 하나의 logical edge로 유지하는 모델을 UI layer까지 보존
- React Flow 도입 후에도 domain model이 vendor type에 오염되지 않는 구조 유지
- e2e에서 placeholder가 아니라 실제 ERD table과 relation label을 검증

### Interview Notes

- “왜 `DatabaseSchema`를 바로 React Flow node로 변환하지 않고 `DiagramGraph`를 거치나요?”
- “React Flow type과 domain type의 결합을 어떻게 막았나요?”
- “ELK 없이 이번 milestone에서 node position을 어떻게 다뤘나요?”
- “FK column metadata와 FK edge는 각각 어디에서 파생되나요?”
- “Next.js App Router에서 client boundary를 어디에 두었나요?”

### Open Questions

- React Flow edge label만으로 FK details가 충분한가, 별도 relation details panel이 필요한가?
- Milestone 7에서 parser 결과와 hard-coded schema를 전환할 때 sample SQL과 visible diagram stale state를 어떻게 표현할 것인가?
- Milestone 8에서 manual positions와 ELK layout result를 어떤 format으로 merge할 것인가?

### Next Milestone Preparation

- editor SQL을 explicit Parse action으로 parser adapter에 연결하는 reducer/use-case 설계
- parse success 시 `DatabaseSchema -> DiagramGraph -> React Flow` 경로를 재사용
- parse error 시 현재 SQL text와 diagnostics는 갱신하되 last valid diagram graph를 유지하는 state transition 정의
- sample SQL loading과 hard-coded schema 제거 또는 fallback 위치 결정

## Milestone 7: Editor-To-Diagram Integration

### Completed Work

- hard-coded `DatabaseSchema`를 제거하고 sample SQL을 parser adapter로 변환해 초기 diagram 생성
- `ErdWorkspace` client component를 추가해 SQL source, parse status, diagnostics, last valid schema 상태 관리
- explicit Parse action으로 `parsePostgresSql -> DatabaseSchema -> DiagramGraph -> React Flow` 경로 연결
- parse 실패 시 current SQL과 diagnostics를 갱신하면서 last valid diagram을 유지하는 reducer transition 구현
- SQL 변경 후 diagram stale 상태를 user-visible status로 표시하고 이전 입력에 대한 stale diagnostics 제거
- sample SQL loading action을 추가하고 기존 SQL 교체 전 confirm guard 적용
- reducer unit test와 Playwright flow로 valid parse, invalid diagnostics, last-valid diagram 보존 검증

### Concepts To Review

- feature-local reducer: UI state transition을 component 내부 조건문보다 명시적으로 관리하는 방식
- last-valid-schema policy: invalid parse가 diagram state를 덮어쓰지 못하게 하는 이유
- derived stale state: `sourceSql`과 `lastParsedSql`을 비교해 별도 boolean 저장을 피하는 방식
- explicit parse action: parsing을 keystroke마다 실행하지 않고 사용자 명령에 연결하는 이유
- client boundary: parser, editor state, React Flow를 browser-facing component 안에 묶고 route entry를 얇게 유지하는 방식
- diagnostics UX: error code, message, line/column을 text로 노출해 색상에만 의존하지 않는 방식

### Code To Revisit

- `src/features/editor/components/erd-workspace.tsx`: editor-to-parser-to-diagram orchestration 확인
- `src/features/editor/state/editor-state.ts`: parse success/failure와 stale state transition 확인
- `src/features/editor/state/editor-state.test.ts`: last valid schema 보존 regression test 확인
- `src/features/editor/sample-sql.ts`: initial sample SQL source 확인
- `src/app/page.tsx`: App Router route entry가 client workspace만 렌더링하는 구조 확인
- `tests/e2e/home.spec.ts`: invalid SQL 후 previous diagram preservation flow 확인

### Portfolio Notes

- Phase 1 privacy boundary를 유지하면서 SQL parsing을 browser-facing client workflow에 연결
- hard-coded schema demo에서 실제 parser-backed vertical slice로 전환
- parser error가 UI crash나 diagram loss로 이어지지 않도록 last valid state model을 분리
- state reducer 단위 테스트와 E2E critical path를 함께 사용해 transformation과 user flow를 분리 검증
- future persistence milestone에서 `sourceSql`, `lastValidSchema`, layout을 저장할 수 있는 state shape 기반 마련

### Interview Notes

- “왜 invalid SQL이 들어와도 기존 diagram을 지우지 않나요?”
- “`isDiagramStale`를 state에 저장하지 않고 derived value로 만든 이유는 무엇인가요?”
- “parser adapter를 client component에서 호출해도 architecture boundary가 유지되는 이유는 무엇인가요?”
- “controlled textarea를 사용하면서 native editing behavior를 어떻게 보존했나요?”
- “unit test와 Playwright test가 각각 어떤 risk를 검증하나요?”
- “sample SQL loading에서 기존 입력을 바로 덮어쓰지 않게 한 이유는 무엇인가요?”

### Open Questions

- parse가 큰 SQL에서 blocking을 만들 경우 Web Worker 이전에 어떤 측정 기준을 둘 것인가?
- diagnostics가 여러 개일 때 editor location highlight 없이 충분히 actionable한가?
- sample loading 후 즉시 parse할지, explicit Parse requirement를 유지할지 product decision이 필요한가?
- relation details는 edge label만으로 충분한가, selected FK details panel이 필요한가?

### Next Milestone Preparation

- Milestone 8에서 `sourceSql`, diagram positions, viewport를 담을 `ProjectDocumentV1` shape와 validation boundary 설계
- React Flow node drag 결과를 stable table ID keyed layout state로 추출하는 adapter 설계
- ELK layout adapter가 반환한 positions와 manual positions를 merge하는 pure function 테스트 준비
- local storage write debounce와 corrupt storage recovery path 정의

## Milestone 8: Layout And Persistence

### Completed Work

- `elkjs`를 runtime dependency로 추가하고 ELK browser bundle entry를 layout adapter 안에 격리
- vendor-neutral `DiagramLayout` model과 position/viewport merge helper 추가
- initial parse와 re-parse 후 missing table positions에 자동 ELK layout 적용
- 기존 table ID의 manual positions를 보존하고 새 table만 auto layout position으로 채우는 merge policy 구현
- user-invoked `Re-layout` action으로 전체 table positions를 ELK 결과로 교체
- React Flow node drag position과 viewport를 workspace state로 끌어올려 persistence 가능하게 변경
- versioned `ProjectDocumentV1` 생성/검증과 localStorage repository adapter 추가
- SQL source, diagram positions, viewport를 debounce 저장하고 refresh 후 복원
- corrupt/unsupported stored project를 crash 없이 fallback 처리하고 `Reset local` action 추가
- layout merge/project document unit test와 refresh restoration Playwright coverage 추가

### Concepts To Review

- ELK graph input: `children`, `edges`, `layoutOptions`를 adapter 내부에서 vendor shape로 변환하는 방식
- position merge policy: existing stable table IDs는 보존하고 new/deleted table IDs만 조정하는 방식
- controlled React Flow viewport: viewport를 state로 보존하면서 localStorage write는 debounce하는 방식
- versioned local document: `sourceSql`을 authoritative data로 두고 layout을 stable ID keyed data로 저장하는 이유
- runtime validation: localStorage JSON을 untrusted input으로 보고 format/version/number fields를 검증하는 이유
- browser bundle boundary: `elkjs` 기본 entry 대신 `elkjs/lib/elk.bundled`를 사용해 Next browser build 문제를 피하는 방식

### Code To Revisit

- `src/adapters/layout/elk/elk-layout-engine.ts`: ELK-specific graph conversion과 error fallback 확인
- `src/features/diagram/layout/model.ts`: persisted layout shape 확인
- `src/features/diagram/layout/merge-layout.ts`: preserve-existing/re-layout merge behavior 확인
- `src/features/project/serialization/project-document.ts`: project document validation과 version guard 확인
- `src/adapters/persistence/local-storage/local-project-repository.ts`: browser storage key와 load/save/remove boundary 확인
- `src/features/editor/components/erd-workspace.tsx`: layout effect, debounced persistence, restore/reset flow 확인
- `tests/e2e/home.spec.ts`: refresh 후 SQL과 moved node position 복원 flow 확인

### Portfolio Notes

- parser/schema/graph/layout/persistence boundary를 분리한 상태로 browser-local MVP 기능을 확장
- localStorage data를 versioned project document로 저장해 future import/export와 cloud migration의 기반 마련
- React Flow와 ELK vendor 타입이 domain model로 새지 않도록 adapter 경계 유지
- invalid SQL preservation에 이어 refresh preservation까지 user-critical state recovery flow 확보
- dependency issue(`web-worker` resolution)를 browser bundle entry로 해결한 사례를 기록 가능

### Interview Notes

- “왜 layout state를 schema model에 넣지 않았나요?”
- “Re-parse 시 기존 manual positions를 어떻게 보존하나요?”
- “localStorage 데이터를 왜 runtime validation하나요?”
- “ELK.js를 React Flow와 직접 섞지 않고 adapter로 둔 이유는 무엇인가요?”
- “왜 storage write를 drag 중 매 프레임마다 하지 않나요?”
- “Next.js build에서 `elkjs` 기본 entry 대신 bundled entry를 사용한 이유는 무엇인가요?”

### Open Questions

- large diagram에서 ELK main-thread layout이 사용성을 해치기 시작하는 기준은 무엇인가?
- viewport restore와 automatic fit-view 사이의 product expectation을 어떻게 조정할 것인가?
- localStorage quota 초과 시 사용자에게 어떤 recovery action을 제공할 것인가?
- persisted schema snapshot을 future recovery cache로 적극 사용할 것인가, source re-parse만 유지할 것인가?

### Next Milestone Preparation

- Milestone 9에서 localStorage `ProjectDocumentV1`과 JSON import/export document를 같은 validation path로 공유
- import 전 현재 local project 교체 confirm/undo strategy 확정
- PNG export에서 React Flow viewport와 diagram bounds를 어떻게 캡처할지 조사
- export adapter가 editor controls 없이 diagram content만 포함하도록 DOM boundary 정리

## Milestone 9: Import And Export

### Completed Work

- `ProjectDocumentV1` validation path를 재사용하는 JSON export/import helper 추가
- `Export JSON` action으로 source SQL, layout, viewport, optional schema snapshot을 versioned project JSON으로 다운로드
- `Import` action으로 JSON file을 읽고 format version/layout/dialect를 검증한 뒤 source SQL을 re-parse해 workspace state 복원
- unsupported project document version과 malformed import JSON을 user-visible error로 표시
- import가 현재 작업을 덮어쓰기 전에 browser confirm을 요구하도록 구현
- `html-to-image`를 runtime dependency로 추가하고 PNG export adapter를 `src/adapters/export/png`에 격리
- `Export PNG` action으로 diagram surface를 PNG data URL로 변환해 다운로드
- PNG export에서 React Flow controls를 filter로 제외하고 editor controls가 포함되지 않도록 diagram surface만 캡처
- JSON export/import, unsupported import, PNG download Playwright coverage 추가

### Concepts To Review

- browser file download: Blob object URL과 data URL download link를 생성하고 정리하는 방식
- file input import flow: hidden input을 button으로 트리거하고 File API `text()`로 JSON을 읽는 방식
- import validation: localStorage와 JSON import가 같은 `parseProjectDocument` runtime validator를 공유하는 이유
- source-of-truth policy: imported `sourceSql`을 다시 parse하고 `schemaSnapshot`은 authoritative data로 사용하지 않는 이유
- PNG DOM export: `html-to-image`의 `toPng`와 `filter` option으로 diagram-only capture를 구성하는 방식
- user confirmation: import가 현재 작업을 silently replace하지 않도록 guard하는 UX

### Code To Revisit

- `src/features/project/serialization/project-export.ts`: JSON export/import helpers와 deterministic filename 확인
- `src/adapters/export/browser-download.ts`: text/data URL download boundary 확인
- `src/adapters/export/png/html-to-image-export.ts`: DOM-to-PNG adapter와 React Flow controls filter 확인
- `src/features/editor/components/erd-workspace.tsx`: Import/Export JSON/PNG actions와 status handling 확인
- `tests/e2e/home.spec.ts`: JSON download/import, unsupported import, PNG download assertions 확인

### Portfolio Notes

- local-first MVP의 portable project export와 diagram image export를 UI로 완성
- storage/import/export가 같은 versioned document contract를 공유해 future cloud persistence migration path 유지
- imported JSON을 untrusted input으로 보고 runtime validation과 user-visible failure path를 제공
- browser-only file workflows를 구현하면서 SQL을 서버나 외부 service로 보내지 않는 privacy boundary 유지
- PNG export dependency를 adapter에 숨겨 future SVG/canvas export 교체 가능성 보존

### Interview Notes

- “왜 JSON import에서 schema snapshot을 그대로 신뢰하지 않고 source SQL을 다시 parse하나요?”
- “imported JSON을 어떤 기준으로 untrusted input으로 처리했나요?”
- “현재 작업을 import로 덮어쓸 때 왜 confirm이 필요한가요?”
- “PNG export가 editor controls를 포함하지 않도록 어떤 DOM boundary를 사용했나요?”
- “DOM-to-image dependency를 adapter로 격리한 이유는 무엇인가요?”
- “localStorage document와 exported JSON document를 같은 shape로 둔 장점은 무엇인가요?”

### Open Questions

- PNG export에서 현재 viewport만 캡처하는 것이 충분한가, 전체 diagram bounds export도 필요한가?
- large diagram PNG export 실패 시 retry/scale-down 옵션을 제공할 것인가?
- imported source SQL parse 실패 시 schemaSnapshot fallback을 보여줄지, source authority policy를 유지할지?
- JSON export filename에 project name이 생기면 어떻게 sanitize할 것인가?

### Next Milestone Preparation

- README에 supported syntax, local-first privacy, setup commands, import/export limitations 문서화
- release hardening에서 empty/corrupt storage, invalid import, PNG export failure copy를 최종 점검
- Vercel deployment를 위한 build/runtime 환경과 CI status 확인
- Phase 1 success criteria checklist를 PRD 기준으로 audit

## Milestone 10: Release Hardening

### Completed Work

- Phase 1 README를 현재 MVP 상태 기준으로 재작성해 기능, 지원 SQL 범위, 아키텍처, 실행 스크립트, 테스트 fixture, Vercel 배포 절차, Codex workflow를 문서화
- 50-table reference fixture를 추가해 중간 규모 schema가 parser normalization과 graph mapping을 통과하는지 검증
- reference performance unit test를 추가해 50-table fixture parse/normalize/map 흐름과 2초 내 목표를 확인
- Playwright critical path에 50-table fixture 렌더링 검증을 추가
- Vercel 배포 설정(`vercel.json`)을 추가해 pnpm frozen install과 repository build script를 명시
- Phase 1 release checklist를 추가해 PRD success criteria별 evidence와 미완료 외부 배포 항목을 구분

### Concepts To Review

- Release hardening: 새 기능 추가보다 문서, 검증, 배포 준비, 성공 기준 audit에 집중하는 단계
- Performance fixture: 정확한 pixel이나 layout 좌표보다 parser/graph의 stable properties와 시간 목표를 검증하는 방식
- Deployment config: Vercel이 Next.js를 auto-detect하더라도 install/build command를 명시해 CI와 production build를 맞추는 이유
- Release checklist: 자동화로 확인 가능한 항목과 외부 계정/환경이 필요한 항목을 분리해서 추적하는 방식
- README as contract: 사용자가 기대할 수 있는 지원 범위와 Phase 1 제외 범위를 명확히 적어 product scope drift를 줄이는 방식

### Code To Revisit

- `README.md`: Phase 1 기능, supported SQL, local-first privacy, setup, deployment documentation 확인
- `docs/release-checklist.md`: PRD success criteria와 release verification evidence 확인
- `vercel.json`: Vercel install/build command가 package scripts와 일치하는지 확인
- `fixtures/postgres/performance-50-tables.sql`: reference performance schema 구조 확인
- `src/shared/reference-performance.test.ts`: parser/normalizer/graph mapper performance assertion 확인
- `tests/e2e/home.spec.ts`: browser-level 50-table rendering critical path 확인

### Portfolio Notes

- Phase 1 MVP를 기능 구현뿐 아니라 문서, 배포 설정, release evidence까지 포함해 마무리
- PRD success criteria를 release checklist로 변환해 완료 기준을 추적 가능한 artifact로 남김
- medium-size reference fixture를 통해 "toy schema only"가 아니라 50-table 입력까지 MVP target을 검증
- Vercel 배포 준비와 actual production deployment dependency를 분리해 external account requirement를 투명하게 기록
- README를 사용 설명서와 architecture overview 역할을 겸하도록 정리해 프로젝트 평가자가 빠르게 기능과 제약을 이해할 수 있게 함

### Interview Notes

- “Release hardening milestone에서는 왜 새 기능보다 문서와 검증을 우선했나요?”
- “성능 기준을 exact layout이 아니라 parser/graph stable properties로 검증한 이유는 무엇인가요?”
- “Vercel 설정에서 install/build command를 명시한 이유는 무엇인가요?”
- “PRD success criteria를 어떻게 release checklist로 바꿨나요?”
- “public deployment처럼 외부 인증이 필요한 항목은 어떻게 리스크로 관리하나요?”
- “README에 out-of-scope를 명확히 쓰는 것이 왜 제품 품질에 도움이 되나요?”

### Open Questions

- production Vercel project를 어느 계정/team에 연결하고 public URL을 어디에 기록할 것인가?
- 50-table target 이후 100-table 이상 large schema에서 Web Worker layout이 필요한 기준은 무엇인가?
- README의 supported syntax를 docs/parser-coverage.md에서 자동 생성할 필요가 있는가?
- release checklist를 PR template이나 GitHub issue checklist로 승격할지 결정 필요

### Next Milestone Preparation

- 인증된 Vercel account로 production deployment를 실행하고 release checklist에 public URL 기록
- Phase 1 release 후 사용자 피드백을 기준으로 quoted identifier fixture, index display, full-diagram PNG export 중 다음 개선 항목 선정
- future Phase 2 scope를 시작하기 전에 direct database connection, auth, cloud persistence 중 product priority 재확정
