# 🛠️ 개발 가이드라인

## 📋 Git 커밋 규칙

### 커밋 메시지 형식
```
Phase [단계번호] - [YYYY-MM-DD HH:MM] [변경 내용]
```

### 예시
```bash
git commit -m "Phase 7 - 2024-12-19 14:30 하이브리드 매크로 시스템 구현 완료"
git commit -m "Phase 8 - 2024-12-19 15:45 볼린저 밴드 계산 로직 추가"
git commit -m "Phase 8 - 2024-12-19 16:20 기술적 지표 UI 연동"
```

### 커밋 타입별 가이드라인

#### 🚀 새로운 Phase 시작
```bash
git commit -m "Phase [N] - [날짜 시간] [Phase명] 구현 시작"
```

#### ✅ Phase 완료
```bash
git commit -m "Phase [N] - [날짜 시간] [Phase명] 구현 완료"
```

#### 🔧 기능 추가/수정
```bash
git commit -m "Phase [N] - [날짜 시간] [구체적인 기능] 추가/수정"
```

#### 🐛 버그 수정
```bash
git commit -m "Phase [N] - [날짜 시간] [버그 내용] 수정"
```

#### 📚 문서 업데이트
```bash
git commit -m "Phase [N] - [날짜 시간] [문서명] 업데이트"
```

#### 🎨 UI/UX 개선
```bash
git commit -m "Phase [N] - [날짜 시간] [UI 요소] 개선"
```

#### ⚡ 성능 최적화
```bash
git commit -m "Phase [N] - [날짜 시간] [최적화 내용] 성능 개선"
```

### 브랜치 전략

#### 메인 브랜치
- `main`: 안정된 릴리즈 버전
- `develop`: 개발 중인 버전

#### 기능 브랜치
- `phase/8-indicators`: Phase 8 구현용 브랜치
- `phase/9-autotrading`: Phase 9 구현용 브랜치
- `hotfix/bug-description`: 긴급 버그 수정

### Phase별 브랜치 생성 예시
```bash
# Phase 8 시작
git checkout -b phase/8-indicators
git commit -m "Phase 8 - 2024-12-19 14:00 기술적 지표 계산 구현 시작"

# 작업 완료 후
git commit -m "Phase 8 - 2024-12-19 18:30 볼린저 밴드 계산 완료"

# main 브랜치로 병합
git checkout main
git merge phase/8-indicators
git commit -m "Phase 8 - 2024-12-19 18:35 기술적 지표 계산 구현 완료 - main 병합"
```

## 📁 파일 구조 관리

### 새 파일 추가 시
```bash
# Phase에 맞는 파일 추가
git add utils/indicators.js
git commit -m "Phase 8 - 2024-12-19 15:00 기술적 지표 계산 모듈 추가"
```

### 파일 삭제 시
```bash
git rm deprecated-file.js
git commit -m "Phase 8 - 2024-12-19 15:30 사용하지 않는 파일 제거"
```

## 🏷️ 태그 관리

### Phase 완료 시 태그 생성
```bash
git tag -a v1.7.0 -m "Phase 7 완료: 하이브리드 매크로 시스템"
git tag -a v1.8.0 -m "Phase 8 완료: 기술적 지표 계산"
```

### 태그 푸시
```bash
git push origin --tags
```

## 📊 진행 상황 추적

### 현재 Phase 확인
```bash
git log --oneline -10
```

### Phase별 커밋 확인
```bash
git log --grep="Phase 8" --oneline
```

## 🔄 일일 작업 플로우

### 1. 작업 시작
```bash
git status
git pull origin main
```

### 2. 작업 중
```bash
# 작은 단위로 자주 커밋
git add .
git commit -m "Phase 8 - 2024-12-19 14:15 SMA 계산 함수 구현"
```

### 3. 작업 종료
```bash
git push origin main
```

## 📝 커밋 메시지 작성 팁

### ✅ 좋은 예시
- `Phase 8 - 2024-12-19 14:30 볼린저 밴드 상/하단 계산 로직 구현`
- `Phase 8 - 2024-12-19 15:45 가격 데이터 검증 및 에러 처리 추가`
- `Phase 8 - 2024-12-19 16:20 지표 계산 결과 UI 표시 기능 완성`

### ❌ 피해야 할 예시
- `수정`
- `업데이트`
- `Phase 8 작업`
- `버그 수정`

### 📏 메시지 길이
- **제목**: 50자 이내
- **본문**: 필요시 72자 단위로 줄바꿈

### 🌍 언어 사용
- **제목**: 한국어 (프로젝트 특성상)
- **본문**: 필요시 한국어로 상세 설명

## 🚨 주의사항

### 커밋하지 말아야 할 것들
- 개인 설정 파일 (`.vscode/settings.json`)
- 임시 파일 (`*.tmp`, `*.log`)
- 민감한 정보 (API 키, 비밀번호)
- 빌드 결과물 (`*.crx`, `dist/`)

### 커밋 전 체크리스트
- [ ] `.gitignore`에 불필요한 파일 추가됨
- [ ] 커밋 메시지가 규칙에 맞음
- [ ] 코드가 정상 작동함
- [ ] 문서가 업데이트됨 (필요시)

## 🔧 Git 설정

### 사용자 정보 설정
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 한국어 커밋 메시지 지원
```bash
git config --global core.quotepath false
git config --global core.precomposeunicode true
```

### 자동 CRLF 변환 (Windows)
```bash
git config --global core.autocrlf true
```

---

## 🔗 관련 문서

- **[텔레그램 연동 가이드](TELEGRAM_INTEGRATION_GUIDE.md)**: 트레이딩뷰-텔레그램-익스텐션 연동 방법
- **[PC 전원 관리 가이드](PC_POWER_MANAGEMENT_GUIDE.md)**: 24시간 자동매매를 위한 PC 설정 방법
- **[구현 단계](IMPLEMENTATION_STEPS.md)**: 프로젝트 개발 로드맵
- **[사용자 가이드](USER_GUIDE.md)**: 익스텐션 사용 방법
- **[설치 가이드](SETUP_GUIDE.md)**: 개발 환경 설정 방법

---

## 📋 현재 프로젝트 상태

- **현재 Phase**: Phase 7 완료
- **다음 Phase**: Phase 8 (기술적 지표 계산)
- **마지막 커밋**: `Phase 7 - 2024-12-19 14:30 하이브리드 매크로 시스템 구현 완료`

---

**💡 팁**: 이 가이드라인을 따르면 프로젝트 진행 상황을 쉽게 추적할 수 있고, 나중에 특정 기능이 언제 구현되었는지 빠르게 찾을 수 있습니다.
