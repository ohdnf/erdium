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

-

### Concepts To Review

-

### Code To Revisit

-

### Portfolio Notes

-

### Interview Notes

-

### Open Questions

-

### Next Milestone Preparation

-

## Milestone 5: Foreign-Key Normalization

### Completed Work

-

### Concepts To Review

-

### Code To Revisit

-

### Portfolio Notes

-

### Interview Notes

-

### Open Questions

-

### Next Milestone Preparation

-

## Milestone 6: Hard-Coded Diagram Vertical Slice

### Completed Work

-

### Concepts To Review

-

### Code To Revisit

-

### Portfolio Notes

-

### Interview Notes

-

### Open Questions

-

### Next Milestone Preparation

-

## Milestone 7: Editor-To-Diagram Integration

### Completed Work

-

### Concepts To Review

-

### Code To Revisit

-

### Portfolio Notes

-

### Interview Notes

-

### Open Questions

-

### Next Milestone Preparation

-

## Milestone 8: Layout And Persistence

### Completed Work

-

### Concepts To Review

-

### Code To Revisit

-

### Portfolio Notes

-

### Interview Notes

-

### Open Questions

-

### Next Milestone Preparation

-

## Milestone 9: Import And Export

### Completed Work

-

### Concepts To Review

-

### Code To Revisit

-

### Portfolio Notes

-

### Interview Notes

-

### Open Questions

-

### Next Milestone Preparation

-

## Milestone 10: Release Hardening

### Completed Work

-

### Concepts To Review

-

### Code To Revisit

-

### Portfolio Notes

-

### Interview Notes

-

### Open Questions

-

### Next Milestone Preparation

-
