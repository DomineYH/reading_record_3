# 📚 학생 독서기록장 구글 스프레드시트 (Apps Script) 연동 및 GitHub Pages 배포 가이드

본 독서기록장은 **HTML, CSS, JavaScript (순수 바닐라 JS)**로 제작되어 별도의 서버나 프레임워크 없이 동작하며, **Google 스프레드시트**를 데이터베이스로 사용하고 **GitHub Pages**를 통해 무료로 영구 호스팅할 수 있습니다.

---

## 📑 목차
1. [구글 스프레드시트 DB 생성](#1-구글-스프레드시트-db-생성)
2. [Google Apps Script 코드 작성](#2-google-apps-script-코드-작성)
3. [웹 앱(Web App)으로 배포하기](#3-웹-앱web-app으로-배포하기)
4. [독서기록장 웹사이트에 URL 연결하기](#4-독서기록장-웹사이트에-url-연결하기)
5. [GitHub Pages 무료 호스팅 배포 방법](#5-github-pages-무료-호스팅-배포-방법)
6. [자주 묻는 질문 및 문제 해결 (FAQ)](#6-자주-묻는-질문-및-문제-해결-faq)

---

## 1. 구글 스프레드시트 DB 생성

1. [Google 스프레드시트(sheets.google.com)](https://sheets.google.com)에 접속하여 **새 스프레드시트**를 만듭니다.
2. 스프레드시트 제목을 `학생 독서기록장 DB`로 변경합니다.
3. 첫 번째 시트의 이름을 `독서기록`으로 지정합니다.
4. **1행(헤더)**에 아래 순서대로 정확하게 열 제목을 입력합니다:

| 열 | 헤더 이름 (1행) | 설명 |
|:---:|:---|:---|
| **A** | `이름` | 학생 이름 (식별용) |
| **B** | `비밀번호` | 학생 비밀번호 (식별용) |
| **C** | `책 읽기 시작한 날` | YYYY-MM-DD |
| **D** | `다 읽은 날` | YYYY-MM-DD |
| **E** | `책 제목` | 도서 제목 |
| **F** | `출판사` | 출판사 이름 |
| **G** | `책 페이지` | 이번 도서의 페이지 수 (숫자) |
| **H** | `누적페이지` | 해당 학생의 총 누적 독서 페이지 수 (자동 계산) |
| **I** | `감상` | 독서 소감 및 느낀 점 |
| **J** | `등록일시` | 기록이 추가된 시스템 시간 (타임스탬프) |

> 💡 **참고:** 웹 앱 스크립트가 1행을 확인하고 2행부터 자동으로 데이터를 누적하여 안전하게 기록합니다.

---

## 2. Google Apps Script 코드 작성

1. 스프레드시트 상단 메뉴에서 **[확장 프로그램]** ➡️ **[Apps Script]**를 클릭합니다.
2. 새 편집기 창이 열리면 기존에 적혀있는 `function myFunction() {}` 코드를 모두 지웁니다.
3. 아래의 완성된 스크립트 코드를 그대로 복사하여 붙여넣습니다:

```javascript
/**
 * 학생 독서기록장 Google Apps Script Web App
 * DB 구조: 이름 | 비밀번호 | 책 읽기 시작한 날 | 다 읽은 날 | 책 제목 | 출판사 | 책 페이지 | 누적페이지 | 감상 | 등록일시
 */

const SHEET_NAME = '독서기록';

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0];
  }
  return sheet;
}

// 초기 헤더 생성 (헤더가 비어있을 때 자동 생성)
function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    const headers = [
      '이름',
      '비밀번호',
      '책 읽기 시작한 날',
      '다 읽은 날',
      '책 제목',
      '출판사',
      '책 페이지',
      '누적페이지',
      '감상',
      '등록일시'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f9f3');
  }
}

// POST 요청 처리 (독서 기록 등록, 로그인, 삭제 등)
function doPost(e) {
  try {
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      throw new Error('전달된 데이터가 없습니다.');
    }

    const action = data.action || 'addRecord';
    let response = {};

    if (action === 'login') {
      response = handleLogin(data.name, data.password);
    } else if (action === 'addRecord') {
      response = handleAddRecord(data);
    } else if (action === 'getRecords') {
      response = handleGetRecords(data.name, data.password);
    } else if (action === 'deleteRecord') {
      response = handleDeleteRecord(data.name, data.password, data.title, data.startDate);
    } else {
      response = { success: false, message: '알 수 없는 요청 action: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// GET 요청 처리 (조회 및 서버 상태 확인)
function doGet(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || 'ping';

    let response = {};

    if (action === 'ping') {
      response = { success: true, message: '학생 독서기록장 Apps Script 서버 정상 가동 중!' };
    } else if (action === 'login') {
      response = handleLogin(params.name, params.password);
    } else if (action === 'getRecords') {
      response = handleGetRecords(params.name, params.password);
    } else {
      response = { success: true, message: 'Apps Script API Endpoint is ready.' };
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 1. 학생 로그인 및 기존 기록 로드 (사용자와 비밀번호가 같은 페이지만 누적)
function handleLogin(name, password) {
  const sheet = getSheet();
  ensureHeaders(sheet);

  const cleanName = (name || '').trim();
  const cleanPass = String(password || '').trim();

  if (!cleanName || !cleanPass) {
    return { success: false, message: '이름과 비밀번호를 모두 입력해주세요.' };
  }

  const rows = sheet.getDataRange().getValues();
  // 1행은 헤더
  let userFound = false;
  let records = [];
  let cumulativePages = 0;

  for (let i = 1; i < rows.length; i++) {
    const rowName = String(rows[i][0]).trim();
    const rowPass = String(rows[i][1]).trim();

    // 사용자와 비밀번호가 둘 다 정확히 일치하는 행의 페이지만 누적 및 조회
    if (rowName === cleanName && rowPass === cleanPass) {
      userFound = true;
      const pageCount = Number(rows[i][6]) || 0;
      cumulativePages += pageCount;
      records.push({
        rowId: i + 1,
        name: rowName,
        password: rowPass,
        startDate: formatDate(rows[i][2]),
        endDate: formatDate(rows[i][3]),
        title: rows[i][4],
        publisher: rows[i][5],
        pageCount: pageCount,
        cumulativePages: cumulativePages,
        review: rows[i][8],
        createdAt: rows[i][9] || ''
      });
    }
  }

  // 신규 학생이거나 비밀번호가 일치하여 로그인 성공
  return {
    success: true,
    isNewUser: !userFound,
    message: userFound ? cleanName + '님, 반갑습니다!' : cleanName + '님 환영합니다! 신규 등록되었습니다.',
    name: cleanName,
    cumulativePages: cumulativePages,
    totalBooks: records.length,
    records: records
  };
}

// 2. 새로운 독서 기록 저장 (사용자와 비밀번호가 일치하는 페이지만 누적 계산)
function handleAddRecord(data) {
  const sheet = getSheet();
  ensureHeaders(sheet);

  const name = String(data.name || '').trim();
  const password = String(data.password || '').trim();
  const startDate = data.startDate || '';
  const endDate = data.endDate || '';
  const title = String(data.title || '').trim();
  const publisher = String(data.publisher || '').trim();
  const pageCount = Number(data.pageCount) || 0;
  const review = String(data.review || '').trim();

  if (!name || !password) {
    return { success: false, message: '학생 이름과 비밀번호가 필요합니다.' };
  }
  if (!title) {
    return { success: false, message: '책 제목을 입력해주세요.' };
  }

  // 사용자와 비밀번호가 같은 행의 페이지만 엄격하게 누적 합산
  const rows = sheet.getDataRange().getValues();
  let currentCumulative = 0;

  for (let i = 1; i < rows.length; i++) {
    const rowName = String(rows[i][0]).trim();
    const rowPass = String(rows[i][1]).trim();

    // 사용자와 비밀번호가 일치할 때만 누적 계산
    if (rowName === name && rowPass === password) {
      currentCumulative += (Number(rows[i][6]) || 0);
    }
  }

  const newCumulative = currentCumulative + pageCount;
  const timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // DB 순서: 이름 | 비밀번호 | 책 읽기 시작한 날 | 다 읽은 날 | 책 제목 | 출판사 | 책 페이지 | 누적페이지 | 감상 | 등록일시
  sheet.appendRow([
    name,
    password,
    startDate,
    endDate,
    title,
    publisher,
    pageCount,
    newCumulative,
    review,
    timestamp
  ]);

  return {
    success: true,
    message: '성공적으로 독서 기록이 저장되었습니다!',
    record: {
      name: name,
      startDate: startDate,
      endDate: endDate,
      title: title,
      publisher: publisher,
      pageCount: pageCount,
      cumulativePages: newCumulative,
      review: review,
      createdAt: timestamp
    },
    newCumulativePages: newCumulative
  };
}

// 3. 기록 목록 조회
function handleGetRecords(name, password) {
  const loginRes = handleLogin(name, password);
  return loginRes;
}

// 4. 기록 삭제 기능
function handleDeleteRecord(name, password, title, startDate) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const cleanName = String(name || '').trim();
  const cleanPass = String(password || '').trim();

  let targetRowIndex = -1;
  for (let i = rows.length - 1; i >= 1; i--) {
    if (String(rows[i][0]).trim() === cleanName && 
        String(rows[i][1]).trim() === cleanPass &&
        String(rows[i][4]).trim() === String(title).trim()) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex > 0) {
    sheet.deleteRow(targetRowIndex);
    return { success: true, message: '기록이 삭제되었습니다.' };
  } else {
    return { success: false, message: '삭제할 기록을 찾을 수 없습니다.' };
  }
}

// 날짜 포맷 헬퍼 함수
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Seoul', 'yyyy-MM-dd');
  }
  return String(val);
}
```

4. 상단 디스크 모양 아이콘(또는 `Ctrl + S` / `Cmd + S`)을 눌러 저장합니다. 프로젝트 이름을 `학생독서기록장_API` 등으로 저장해주세요.

---

## 3. 웹 앱(Web App)으로 배포하기

⚠️ **가장 중요한 단계입니다! 권한 설정을 아래와 같이 정확히 해야 웹사이트에서 접속할 수 있습니다.**

1. Apps Script 편집기 우측 상단의 푸른색 **[배포]** ➡️ **[새 배포]** 버튼을 클릭합니다.
2. 유형 선택 좌측 톱니바퀴 아이콘을 클릭하고 **[웹 앱(Web app)]**을 선택합니다.
3. 설정을 다음과 같이 지정합니다:
   - **설명**: `학생 독서기록장 v1`
   - **다음 사용자로 실행 (Execute as)**: `나(내 Google 계정)` 선택
   - **액세스 권한이 있는 사용자 (Who has access)**: **`모든 사용자 (Anyone)`** 선택 🌟 *(필수!)*
4. 하단 **[배포]** 버튼을 클릭합니다.
5. 처음 배포 시 **[액세스 승인(Authorize access)]** 팝업이 뜹니다:
   - 본인의 구글 계정을 선택합니다.
   - *"Google에서 확인하지 않은 앱"* 경고 화면이 나타나면 좌측 하단의 **[고급 (Advanced)]** 클릭 후 **`[학생독서기록장_API(으)로 이동(안전하지 않음)]`**을 클릭합니다.
   - 다음 화면에서 **[허용 (Allow)]**을 클릭합니다.
6. 배포가 완료되면 화면에 **웹 앱 URL**이 나타납니다.
   - 형식: `https://script.google.com/macros/s/AKfycbx.../exec`
   - 이 URL을 **복사**합니다.

---

## 4. 독서기록장 웹사이트에 URL 연결하기

1. 배포된 독서기록장 웹페이지(`index.html`)를 브라우저에서 엽니다.
2. 우측 상단의 **[⚙️ Google Sheets 연동 설정]** 버튼을 클릭합니다.
3. 복사한 Apps Script **웹 앱 URL**을 입력창에 붙여넣고 **[연동 확인 및 저장]** 버튼을 누릅니다.
4. "연동 성공! 스프레드시트와 정상적으로 연결되었습니다." 알림이 뜨면 연동 완료!
5. 이제 학생이 이름과 비밀번호로 로그인하고 책을 기록하면 **구글 스프레드시트에 실시간으로 한 줄씩 차곡차곡 저장**됩니다!

> 💡 **Tip:** URL을 아직 등록하지 않아도 브라우저 로컬 저장소(LocalStorage)를 통해 모든 기능을 바로 체험하고 테스트해볼 수 있습니다. 나중에 URL을 입력하면 자동으로 구글 시트와 연동됩니다.

---

## 5. GitHub Pages 무료 호스팅 배포 방법

본 프로그램은 순수 **HTML, CSS, JavaScript**만으로 구성되어 있어 GitHub Pages에서 클릭 몇 번으로 무료 배포할 수 있습니다.

### 방법 A. GitHub 웹사이트에서 직접 업로드 (가장 쉬운 방법)
1. [GitHub](https://github.com)에 로그인 후 새 저장소(New Repository)를 생성합니다.
   - Repository name: `reading-log` (원하는 이름)
   - Public(공개)으로 설정
2. 저장소 페이지에서 **[Upload files]**를 클릭하여 아래 파일들을 드래그 앤 드롭으로 업로드합니다:
   - `index.html` (메인 화면)
   - `style.css` (네이버 스타일 시트)
   - `app.js` (독서기록 자바스크립트 엔진)
   - `app_setup.md` (설정 가이드)
3. 하단 **[Commit changes]**를 클릭하여 저장합니다.
4. 저장소 상단 탭에서 **[Settings]** ➡️ 좌측 메뉴의 **[Pages]**를 클릭합니다.
5. **Build and deployment** 섹션에서:
   - Source: `Deploy from a branch`
   - Branch: `main` (또는 `master`), 폴더: `/ (root)` 선택 후 **[Save]** 클릭
6. 약 1~2분 후 페이지 상단에 **`Your site is live at https://<사용자아이디>.github.io/reading-log/`** 주소가 생성됩니다.
7. 해당 주소를 학생들에게 공유하면 언제 어디서든 스마트폰, 태블릿, PC로 독서기록장을 작성할 수 있습니다!

---

## 6. 자주 묻는 질문 및 문제 해결 (FAQ)

### Q1. 스프레드시트에 데이터가 들어가지 않아요!
- Apps Script 배포 시 **[액세스 권한이 있는 사용자]**가 `모든 사용자(Anyone)`로 설정되어 있는지 확인하세요. `나만(Only myself)`으로 설정되어 있으면 학생 웹사이트에서 기록을 보낼 수 없습니다.
- 코드를 수정한 후에는 반드시 **[배포]** ➡️ **[배포 관리]** ➡️ 연필(수정) 아이콘 ➡️ 버전을 **`새 버전(New version)`**으로 올리고 배포해야 수정사항이 반영됩니다.

### Q2. 학생의 비밀번호는 어떻게 관리되나요?
- 학생이 처음 입력한 비밀번호가 해당 학생의 비밀번호로 지정됩니다.
- 구글 스프레드시트 B열(`비밀번호`)에 저장되며, 학생이 다시 로그인할 때 이름과 비밀번호를 대조하여 본인의 기록만 열람할 수 있도록 안전하게 식별합니다.

### Q3. 누적 페이지는 어떻게 계산되나요?
- 사용자가 새 도서를 등록할 때, 스프레드시트에 저장된 해당 학생의 이전 모든 독서 페이지를 자동으로 합산하고 이번에 읽은 페이지를 더해 **`누적페이지`** 열(H열)에 자동으로 기록됩니다.
- 웹사이트 내에서도 학생의 완독 도서 총 페이지 수가 실시간으로 합산되어 대시보드와 독서 뱃지로 표시됩니다.
