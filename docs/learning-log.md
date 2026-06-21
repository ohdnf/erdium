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
