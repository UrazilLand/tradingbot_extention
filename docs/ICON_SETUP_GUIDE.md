# 아이콘 설정 가이드

## 아이콘 파일 준비

Chrome Extension은 다음 크기의 아이콘이 필요합니다:
- **16x16**: 브라우저 툴바 아이콘
- **32x32**: 익스텐션 관리 페이지
- **48x48**: 익스텐션 관리 페이지 (확대)
- **128x128**: Chrome 웹 스토어 (선택사항)

## 아이콘 파일 추가 방법

1. **아이콘 이미지 준비**
   - PNG 형식의 이미지 파일 준비
   - 위 4가지 크기로 이미지 생성 (또는 128x128 하나만 준비해도 자동 리사이즈 가능)

2. **assets 폴더에 파일 추가**
   ```
   assets/
   ├── icon16.png
   ├── icon32.png
   ├── icon48.png
   └── icon128.png
   ```

3. **manifest.json 업데이트**
   - 아래 예시처럼 "icons" 필드 추가
   - "action"에 "default_icon" 추가

## 아이콘 생성 도구

온라인 아이콘 생성기:
- https://www.favicon-generator.org/
- https://realfavicongenerator.net/
- https://www.iconfinder.com/ (무료 아이콘 다운로드)

## 현재 상태

현재 manifest.json에는 아이콘 설정이 없습니다.
아이콘 파일을 추가한 후 manifest.json을 업데이트하면 됩니다.

