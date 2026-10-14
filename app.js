/**
 * 학생 독서기록장 (Naver Style Reading Log)
 * Pure Vanilla JavaScript (No Frameworks)
 * Compatible with GitHub Pages & Google Apps Script
 */

(function () {
  'use strict';

  // ================= STATE & CONFIGURATION =================
  const STORAGE_KEYS = {
    CURRENT_USER: 'reading_log_current_user',
    GAS_URL: 'reading_log_gas_url',
    USERS_DB: 'reading_log_users_db',
    RECORDS_PREFIX: 'reading_log_records_'
  };

  let currentUser = null; // { name: string, password: string }
  let userRecords = [];   // Array of book records for currentUser
  let currentRating = 5;
  let currentSort = 'newest';
  let currentViewMode = 'cards'; // 'cards' | 'table'
  let currentFilterQuery = '';
  let selectedRecord = null; // For detail modal

  const DAILY_QUOTES = [
    { text: "책 읽는 습관을 기르는 것은 인생의 거의 모든 불행으로부터 당신을 보호하는 피난처를 짓는 일이다.", author: "서머싯 몸" },
    { text: "오늘의 나를 있게 한 것은 우리 마을의 작은 도서관이었다. 하버드 졸업장보다 소중한 것이 독서 습관이다.", author: "빌 게이츠" },
    { text: "책 없는 방은 영혼 없는 육체와 같다.", author: "키케로" },
    { text: "독서는 완성된 사람을 만들고, 담론은 재치 있는 사람을 만들며, 필기는 정확한 사람을 만든다.", author: "프랜시스 베이컨" },
    { text: "한 권의 책을 읽음으로써 자신의 삶에서 새 시대를 본 사람이 너무나 많다.", author: "헨리 데이비드 소로" },
    { text: "책은 청년에게는 음식이 되고 노인에게는 오락이 되며, 순경(順境)일 때는 미화가 되고 역경일 때는 위안이 된다.", author: "키케로" }
  ];
  let quoteIndex = 0;

  // Pre-seed sample records for demo user '홍길동' if not existing
  function initDemoData() {
    const demoKey = STORAGE_KEYS.RECORDS_PREFIX + '홍길동';
    if (!localStorage.getItem(demoKey)) {
      const demoRecords = [
        {
          name: '홍길동',
          password: '1234',
          startDate: '2026-03-01',
          endDate: '2026-03-05',
          title: '어린 왕자',
          publisher: '열린책들',
          pageCount: 140,
          cumulativePages: 140,
          review: '여우가 어린 왕자에게 들려준 "가장 중요한 것은 눈에 보이지 않아"라는 말이 오랫동안 마음에 남았다. 친구와의 관계에 대해 다시 생각해보게 되었다.',
          rating: 5,
          createdAt: '2026-03-05 18:30:00'
        },
        {
          name: '홍길동',
          password: '1234',
          startDate: '2026-03-10',
          endDate: '2026-03-18',
          title: '아몬드',
          publisher: '창비',
          pageCount: 270,
          cumulativePages: 410,
          review: '감정을 느끼지 못하는 주인공 윤재가 타인과 관계를 맺고 아픔을 극복해가는 과정이 무척 감동적이었다. 서로의 다름을 인정하는 따뜻함을 배웠다.',
          rating: 5,
          createdAt: '2026-03-18 20:15:00'
        }
      ];
      localStorage.setItem(demoKey, JSON.stringify(demoRecords));
      
      // Save password for demo user
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '{}');
      users['홍길동'] = '1234';
      users['이순신'] = '1234';
      localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
    }
  }

  // ================= DOM ELEMENT REFERENCES =================
  const els = {
    // Header & Navigation
    gasStatusBadge: document.getElementById('gasStatusBadge'),
    gasStatusText: document.getElementById('gasStatusText'),
    openSettingsBtn: document.getElementById('openSettingsBtn'),
    globalSearchInput: document.getElementById('globalSearchInput'),
    searchSubmitBtn: document.getElementById('searchSubmitBtn'),
    menuTabs: document.querySelectorAll('.menu-tab'),
    menuBookCount: document.getElementById('menuBookCount'),

    // Sidebar: Login & Profile
    loginFormContainer: document.getElementById('loginFormContainer'),
    profileContainer: document.getElementById('profileContainer'),
    studentLoginForm: document.getElementById('studentLoginForm'),
    studentNameInput: document.getElementById('studentNameInput'),
    studentPasswordInput: document.getElementById('studentPasswordInput'),
    loginBtn: document.getElementById('loginBtn'),
    profileStudentName: document.getElementById('profileStudentName'),
    profileBadgeRole: document.getElementById('profileBadgeRole'),
    profileBooksCount: document.getElementById('profileBooksCount'),
    profileCumulativePages: document.getElementById('profileCumulativePages'),
    avatarInitial: document.getElementById('avatarInitial'),
    logoutBtn: document.getElementById('logoutBtn'),
    syncRecordsBtn: document.getElementById('syncRecordsBtn'),

    // Tab 1: Form
    loginRequiredNotice: document.getElementById('loginRequiredNotice'),
    readingRecordForm: document.getElementById('readingRecordForm'),
    displayCurrentPages: document.getElementById('displayCurrentPages'),
    displayThisPage: document.getElementById('displayThisPage'),
    displayNewCumulative: document.getElementById('displayNewCumulative'),
    bookTitle: document.getElementById('bookTitle'),
    bookPublisher: document.getElementById('bookPublisher'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    bookPages: document.getElementById('bookPages'),
    bookReview: document.getElementById('bookReview'),
    reviewCharCount: document.getElementById('reviewCharCount'),
    readingDurationHint: document.getElementById('readingDurationHint'),
    starBtns: document.querySelectorAll('.star-btn'),
    ratingText: document.getElementById('ratingText'),
    submitRecordBtn: document.getElementById('submitRecordBtn'),

    // Tab 2: Bookshelf
    shelfBookCount: document.getElementById('shelfBookCount'),
    shelfTotalPages: document.getElementById('shelfTotalPages'),
    shelfSortSelect: document.getElementById('shelfSortSelect'),
    viewCardsBtn: document.getElementById('viewCardsBtn'),
    viewTableBtn: document.getElementById('viewTableBtn'),
    bookCardsGrid: document.getElementById('bookCardsGrid'),
    bookTableWrapper: document.getElementById('bookTableWrapper'),
    bookTableBody: document.getElementById('bookTableBody'),
    emptyShelfState: document.getElementById('emptyShelfState'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    printPortfolioBtn: document.getElementById('printPortfolioBtn'),

    // Tab 3: Stats & Badges
    statBooksCount: document.getElementById('statBooksCount'),
    statCumulativePages: document.getElementById('statCumulativePages'),
    statAvgPages: document.getElementById('statAvgPages'),
    statAvgRating: document.getElementById('statAvgRating'),
    marathonPercent: document.getElementById('marathonPercent'),
    marathonFill: document.getElementById('marathonFill'),
    marathonCurrentPages: document.getElementById('marathonCurrentPages'),
    marathonRemainPages: document.getElementById('marathonRemainPages'),
    badgesContainer: document.getElementById('badgesContainer'),

    // Daily Quote
    dailyQuoteText: document.getElementById('dailyQuoteText'),
    dailyQuoteAuthor: document.getElementById('dailyQuoteAuthor'),

    // Modals
    settingsModal: document.getElementById('settingsModal'),
    gasUrlInput: document.getElementById('gasUrlInput'),
    saveGasUrlBtn: document.getElementById('saveGasUrlBtn'),
    clearGasUrlBtn: document.getElementById('clearGasUrlBtn'),
    bookDetailModal: document.getElementById('bookDetailModal'),
    detailModalTitle: document.getElementById('detailModalTitle'),
    detailModalBody: document.getElementById('detailModalBody'),
    deleteRecordBtn: document.getElementById('deleteRecordBtn'),
    toastContainer: document.getElementById('toastContainer')
  };

  // ================= UTILITIES: TOAST NOTIFICATIONS =================
  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.innerHTML = `
      <span>${isError ? '⚠️' : '✅'}</span>
      <span>${message}</span>
    `;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ================= DATE HELPERS =================
  function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function calculateDays(start, end) {
    if (!start || !end) return '';
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e - s;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays <= 0) return '완독일이 시작일보다 앞섭니다.';
    if (diffDays === 1) return '(당일 완독!)';
    return `(${diffDays}일간 독서)`;
  }

  // ================= APP INITIALIZATION =================
  function init() {
    initDemoData();

    // Default dates
    const today = getTodayString();
    if (els.startDate) els.startDate.value = today;
    if (els.endDate) els.endDate.value = today;

    // Check Google Apps Script URL
    updateGasStatusUI();

    // Setup event listeners
    bindEvents();

    // Try restoring saved user session
    const savedUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        handleStudentLogin(parsed.name, parsed.password, false);
      } catch (e) {
        showLoggedOutUI();
      }
    } else {
      showLoggedOutUI();
    }

    renderQuote();
  }

  // ================= EVENT LISTENERS =================
  function bindEvents() {
    // Menu tab switching
    els.menuTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabId = tab.getAttribute('data-tab');
        switchTab(tabId);
      });
    });

    // Login Form Submit
    if (els.studentLoginForm) {
      els.studentLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = els.studentNameInput.value.trim();
        const password = els.studentPasswordInput.value.trim();
        if (!name || !password) {
          showToast('학생 이름과 비밀번호를 모두 입력해주세요.', true);
          return;
        }
        handleStudentLogin(name, password, true);
      });
    }

    // Logout Button
    if (els.logoutBtn) {
      els.logoutBtn.addEventListener('click', handleLogout);
    }

    // Sync Button
    if (els.syncRecordsBtn) {
      els.syncRecordsBtn.addEventListener('click', () => {
        if (!currentUser) return;
        syncWithAppsScript(currentUser.name, currentUser.password, true);
      });
    }

    // Star rating buttons
    els.starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const r = parseInt(btn.getAttribute('data-rating'), 10);
        setRating(r);
      });
    });

    // Form inputs live calculation
    if (els.bookPages) {
      els.bookPages.addEventListener('input', updateCumulativeLivePreview);
    }
    if (els.startDate && els.endDate) {
      const updateHint = () => {
        els.readingDurationHint.textContent = calculateDays(els.startDate.value, els.endDate.value);
      };
      els.startDate.addEventListener('change', updateHint);
      els.endDate.addEventListener('change', updateHint);
      updateHint();
    }

    // Review character counter
    if (els.bookReview) {
      els.bookReview.addEventListener('input', () => {
        els.reviewCharCount.textContent = els.bookReview.value.length;
      });
    }

    // Record submission
    if (els.readingRecordForm) {
      els.readingRecordForm.addEventListener('submit', handleRecordSubmit);
    }

    // Search and Sort
    if (els.globalSearchInput) {
      els.globalSearchInput.addEventListener('input', (e) => {
        currentFilterQuery = e.target.value.toLowerCase().trim();
        renderBookshelf();
      });
    }
    if (els.searchSubmitBtn) {
      els.searchSubmitBtn.addEventListener('click', () => {
        switchTab('shelf');
      });
    }
    if (els.shelfSortSelect) {
      els.shelfSortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderBookshelf();
      });
    }

    // View toggle (Cards vs Table)
    if (els.viewCardsBtn) {
      els.viewCardsBtn.addEventListener('click', () => {
        currentViewMode = 'cards';
        els.viewCardsBtn.classList.add('active');
        els.viewTableBtn.classList.remove('active');
        renderBookshelf();
      });
    }
    if (els.viewTableBtn) {
      els.viewTableBtn.addEventListener('click', () => {
        currentViewMode = 'table';
        els.viewTableBtn.classList.add('active');
        els.viewCardsBtn.classList.remove('active');
        renderBookshelf();
      });
    }

    // Export CSV
    if (els.exportCsvBtn) {
      els.exportCsvBtn.addEventListener('click', exportToCsv);
    }

    // Print
    if (els.printPortfolioBtn) {
      els.printPortfolioBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Google Apps Script Settings Modal
    if (els.openSettingsBtn) {
      els.openSettingsBtn.addEventListener('click', openSettingsModal);
    }
    if (els.saveGasUrlBtn) {
      els.saveGasUrlBtn.addEventListener('click', saveGasUrl);
    }
    if (els.clearGasUrlBtn) {
      els.clearGasUrlBtn.addEventListener('click', clearGasUrl);
    }

    // Delete Record from Detail Modal
    if (els.deleteRecordBtn) {
      els.deleteRecordBtn.addEventListener('click', handleDeleteCurrentRecord);
    }
  }

  // ================= TAB MANAGEMENT =================
  window.switchTab = function (tabId) {
    els.menuTabs.forEach(t => {
      if (t.getAttribute('data-tab') === tabId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    const panes = ['record', 'shelf', 'stats', 'recommend'];
    panes.forEach(p => {
      const paneEl = document.getElementById('tab-' + p);
      if (paneEl) {
        paneEl.style.display = (p === tabId) ? 'block' : 'none';
      }
    });

    if (tabId === 'shelf') {
      renderBookshelf();
    } else if (tabId === 'stats') {
      renderStats();
    } else if (tabId === 'record') {
      updateCumulativeLivePreview();
    }
  };

  // ================= RATING SELECTOR =================
  function setRating(rating) {
    currentRating = rating;
    const labels = {
      1: '1점 / 아쉬웠어요',
      2: '2점 / 보통이에요',
      3: '3점 / 읽을 만해요',
      4: '4점 / 꽤 재미있어요!',
      5: '5점 / 적극 추천해요!'
    };
    els.ratingText.textContent = labels[rating] || `${rating}점`;
    els.starBtns.forEach(btn => {
      const r = parseInt(btn.getAttribute('data-rating'), 10);
      if (r <= rating) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Quick Prompt Inserter
  window.addReviewPrompt = function (text) {
    if (!els.bookReview) return;
    const current = els.bookReview.value.trim();
    if (current) {
      els.bookReview.value = current + ' ' + text;
    } else {
      els.bookReview.value = text;
    }
    els.bookReview.focus();
    els.reviewCharCount.textContent = els.bookReview.value.length;
  };

  // Quick Login helper
  window.quickLogin = function (name, password) {
    if (els.studentNameInput && els.studentPasswordInput) {
      els.studentNameInput.value = name;
      els.studentPasswordInput.value = password;
      handleStudentLogin(name, password, true);
    }
  };

  // ================= STUDENT LOGIN & AUTH =================
  async function handleStudentLogin(name, password, isInteractive = false) {
    const gasUrl = localStorage.getItem(STORAGE_KEYS.GAS_URL);
    
    if (isInteractive) {
      els.loginBtn.disabled = true;
      els.loginBtn.textContent = '로그인 확인 중...';
    }

    try {
      // 1. If Google Apps Script URL exists, try logging in with Google Sheets API
      if (gasUrl) {
        try {
          const response = await fetchWithTimeout(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'login',
              name: name,
              password: password
            })
          }, 6000);

          const result = await response.json();
          if (result && result.success) {
            currentUser = { name: result.name || name, password: password };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
            
            // If Apps Script returned records from Google Sheet, save them
            if (Array.isArray(result.records)) {
              userRecords = result.records;
              saveLocalRecords(name, userRecords);
            } else {
              userRecords = loadLocalRecords(name);
            }

            onLoginSuccess(isInteractive, result.message || `${name} 학생 로그인 완료!`);
            return;
          } else if (result && result.message) {
            // Wrong password error from Google Sheets
            showToast(result.message, true);
            if (isInteractive) {
              els.loginBtn.disabled = false;
              els.loginBtn.textContent = '독서기록장 로그인';
            }
            return;
          }
        } catch (gasErr) {
          console.warn('Apps Script login failed, falling back to local database:', gasErr);
          // Fall through to local auth
        }
      }

      // 2. Local Fallback Auth
      const usersDb = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS_DB) || '{}');
      if (usersDb[name] && usersDb[name] !== password) {
        showToast('비밀번호가 일치하지 않습니다. 다시 확인해주세요.', true);
        if (isInteractive) {
          els.loginBtn.disabled = false;
          els.loginBtn.textContent = '독서기록장 로그인';
        }
        return;
      }

      // If new user or matching password, save password
      usersDb[name] = password;
      localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(usersDb));

      currentUser = { name, password };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      userRecords = loadLocalRecords(name);

      onLoginSuccess(isInteractive, `${name} 학생 환영합니다!`);

    } finally {
      if (isInteractive) {
        els.loginBtn.disabled = false;
        els.loginBtn.textContent = '독서기록장 로그인';
      }
    }
  }

  function onLoginSuccess(showNotice, message) {
    showLoggedInUI();
    updateCumulativeLivePreview();
    renderBookshelf();
    renderStats();
    if (showNotice) {
      showToast(message);
    }
  }

  function handleLogout() {
    currentUser = null;
    userRecords = [];
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    showLoggedOutUI();
    renderBookshelf();
    renderStats();
    showToast('안전하게 로그아웃 되었습니다.');
  }

  function showLoggedInUI() {
    els.loginFormContainer.style.display = 'none';
    els.profileContainer.style.display = 'block';
    els.loginRequiredNotice.style.display = 'none';
    els.readingRecordForm.style.display = 'block';

    if (currentUser) {
      els.profileStudentName.textContent = currentUser.name;
      els.avatarInitial.textContent = currentUser.name.slice(0, 2);
    }
    updateProfileBadgesAndStats();
  }

  function showLoggedOutUI() {
    els.loginFormContainer.style.display = 'block';
    els.profileContainer.style.display = 'none';
    els.loginRequiredNotice.style.display = 'block';
    els.readingRecordForm.style.display = 'none';
    els.menuBookCount.textContent = '0';
  }

  // ================= LOCAL STORAGE HELPERS =================
  function loadLocalRecords(name) {
    const key = STORAGE_KEYS.RECORDS_PREFIX + name;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalRecords(name, records) {
    const key = STORAGE_KEYS.RECORDS_PREFIX + name;
    localStorage.setItem(key, JSON.stringify(records));
  }

  // ================= CUMULATIVE PAGES CALCULATION =================
  // DB requirement: 누적페이지는 책페이지들의 합
  function getCurrentCumulativePages() {
    return userRecords.reduce((sum, r) => sum + (Number(r.pageCount) || 0), 0);
  }

  function updateCumulativeLivePreview() {
    const currentTotal = getCurrentCumulativePages();
    const thisPage = parseInt(els.bookPages?.value, 10) || 0;
    const newTotal = currentTotal + thisPage;

    if (els.displayCurrentPages) els.displayCurrentPages.textContent = `${currentTotal.toLocaleString()} 쪽`;
    if (els.displayThisPage) els.displayThisPage.textContent = `${thisPage.toLocaleString()} 쪽`;
    if (els.displayNewCumulative) els.displayNewCumulative.textContent = `${newTotal.toLocaleString()} 쪽`;
  }

  function updateProfileBadgesAndStats() {
    const totalPages = getCurrentCumulativePages();
    const count = userRecords.length;

    if (els.profileBooksCount) els.profileBooksCount.innerHTML = `${count} <small>권</small>`;
    if (els.profileCumulativePages) els.profileCumulativePages.innerHTML = `${totalPages.toLocaleString()} <small>쪽</small>`;
    if (els.menuBookCount) els.menuBookCount.textContent = count;

    // Determine badge rank
    let rank = '🌱 새싹 독서가';
    if (totalPages >= 3000) rank = '🏃 마라톤 완주자';
    else if (totalPages >= 1000) rank = '👑 독서 마스터';
    else if (totalPages >= 500) rank = '🌟 열혈 책벌레';
    else if (totalPages >= 300) rank = '🚀 독서 탐험가';
    else if (totalPages >= 100) rank = '📖 성실한 독서가';

    if (els.profileBadgeRole) els.profileBadgeRole.textContent = rank;
  }

  // ================= RECORD CREATION & SUBMISSION =================
  async function handleRecordSubmit(e) {
    e.preventDefault();

    if (!currentUser) {
      showToast('먼저 학생 로그인을 진행해주세요.', true);
      return;
    }

    const title = els.bookTitle.value.trim();
    const publisher = els.bookPublisher.value.trim();
    const startDate = els.startDate.value;
    const endDate = els.endDate.value;
    const pageCount = parseInt(els.bookPages.value, 10);
    const review = els.bookReview.value.trim();

    if (!title || !publisher || !startDate || !endDate || isNaN(pageCount) || pageCount <= 0 || !review) {
      showToast('모든 필수 항목을 올바르게 입력해주세요.', true);
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      showToast('다 읽은 날은 시작일보다 이전일 수 없습니다.', true);
      return;
    }

    // Calculate new cumulative pages: sum of all existing records + new book
    const previousTotal = getCurrentCumulativePages();
    const cumulativePages = previousTotal + pageCount;
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newRecord = {
      name: currentUser.name,
      password: currentUser.password,
      startDate: startDate,
      endDate: endDate,
      title: title,
      publisher: publisher,
      pageCount: pageCount,
      cumulativePages: cumulativePages,
      review: review,
      rating: currentRating,
      createdAt: timestamp
    };

    els.submitRecordBtn.disabled = true;
    els.submitRecordBtn.innerHTML = `<span>⏳ 저장 중...</span>`;

    try {
      // 1. Save to Google Apps Script if configured
      const gasUrl = localStorage.getItem(STORAGE_KEYS.GAS_URL);
      let gasSaved = false;

      if (gasUrl) {
        try {
          const res = await fetchWithTimeout(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'addRecord',
              ...newRecord
            })
          }, 8000);

          const json = await res.json();
          if (json && json.success) {
            gasSaved = true;
          }
        } catch (err) {
          console.warn('Google Sheets save failed, saved locally:', err);
        }
      }

      // 2. Always maintain in userRecords and LocalStorage
      userRecords.push(newRecord);
      saveLocalRecords(currentUser.name, userRecords);

      // Reset form
      els.bookTitle.value = '';
      els.bookPublisher.value = '';
      els.bookPages.value = '';
      els.bookReview.value = '';
      els.reviewCharCount.textContent = '0';
      setRating(5);
      updateCumulativeLivePreview();
      updateProfileBadgesAndStats();
      renderBookshelf();
      renderStats();

      if (gasSaved) {
        showToast('🎉 구글 스프레드시트에 성공적으로 기록되었습니다!');
      } else {
        showToast(`🎉 독서 기록이 등록되었습니다! (누적 ${cumulativePages.toLocaleString()}쪽)`);
      }

      // Switch to bookshelf tab to celebrate
      setTimeout(() => {
        switchTab('shelf');
      }, 500);

    } catch (err) {
      showToast('저장 중 오류가 발생했습니다: ' + err.message, true);
    } finally {
      els.submitRecordBtn.disabled = false;
      els.submitRecordBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          <polyline points="17 21 17 13 7 13 7 21"></polyline>
          <polyline points="7 3 7 8 15 8"></polyline>
        </svg>
        <span>독서 기록 등록하기</span>
      `;
    }
  }

  // ================= SYNC WITH GOOGLE APPS SCRIPT =================
  async function syncWithAppsScript(name, password, showNotice = false) {
    const gasUrl = localStorage.getItem(STORAGE_KEYS.GAS_URL);
    if (!gasUrl) {
      if (showNotice) showToast('스프레드시트 연동 URL이 아직 설정되지 않았습니다.', true);
      return;
    }

    try {
      if (showNotice) showToast('구글 스프레드시트와 동기화 중...');
      const res = await fetchWithTimeout(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'getRecords',
          name: name,
          password: password
        })
      }, 8000);

      const json = await res.json();
      if (json && json.success && Array.isArray(json.records)) {
        userRecords = json.records;
        saveLocalRecords(name, userRecords);
        updateProfileBadgesAndStats();
        renderBookshelf();
        renderStats();
        if (showNotice) showToast(`동기화 완료! 총 ${userRecords.length}권의 기록을 가져왔습니다.`);
      } else if (json && json.message) {
        if (showNotice) showToast(json.message, true);
      }
    } catch (e) {
      if (showNotice) showToast('동기화 실패: 네트워크나 Apps Script URL을 확인해주세요.', true);
    }
  }

  // ================= BOOKSHELF RENDERING =================
  function getFilteredAndSortedRecords() {
    let list = [...userRecords];

    // Filter
    if (currentFilterQuery) {
      list = list.filter(r => 
        (r.title && r.title.toLowerCase().includes(currentFilterQuery)) ||
        (r.publisher && r.publisher.toLowerCase().includes(currentFilterQuery)) ||
        (r.review && r.review.toLowerCase().includes(currentFilterQuery))
      );
    }

    // Sort
    list.sort((a, b) => {
      if (currentSort === 'newest') {
        return new Date(b.endDate || b.createdAt) - new Date(a.endDate || a.createdAt);
      } else if (currentSort === 'oldest') {
        return new Date(a.endDate || a.createdAt) - new Date(b.endDate || b.createdAt);
      } else if (currentSort === 'pagesDesc') {
        return (Number(b.pageCount) || 0) - (Number(a.pageCount) || 0);
      } else if (currentSort === 'ratingDesc') {
        return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      }
      return 0;
    });

    return list;
  }

  function renderBookshelf() {
    const list = getFilteredAndSortedRecords();
    const totalPages = getCurrentCumulativePages();

    if (els.shelfBookCount) els.shelfBookCount.textContent = userRecords.length;
    if (els.shelfTotalPages) els.shelfTotalPages.textContent = totalPages.toLocaleString();

    if (!userRecords.length) {
      els.emptyShelfState.style.display = 'block';
      els.bookCardsGrid.style.display = 'none';
      els.bookTableWrapper.style.display = 'none';
      return;
    }

    els.emptyShelfState.style.display = 'none';

    if (currentViewMode === 'cards') {
      els.bookCardsGrid.style.display = 'grid';
      els.bookTableWrapper.style.display = 'none';
      renderCards(list);
    } else {
      els.bookCardsGrid.style.display = 'none';
      els.bookTableWrapper.style.display = 'block';
      renderTable(list);
    }
  }

  function renderCards(list) {
    if (!list.length) {
      els.bookCardsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
          🔍 검색 조건에 일치하는 도서가 없습니다.
        </div>
      `;
      return;
    }

    const gradients = [
      'linear-gradient(135deg, #03c75a, #00873a)',
      'linear-gradient(135deg, #0099ff, #005bb5)',
      'linear-gradient(135deg, #ff9900, #cc7000)',
      'linear-gradient(135deg, #8b5cf6, #5b21b6)',
      'linear-gradient(135deg, #ec4899, #be185d)'
    ];

    els.bookCardsGrid.innerHTML = list.map((record, idx) => {
      const grad = gradients[idx % gradients.length];
      const stars = '★'.repeat(record.rating || 5) + '☆'.repeat(5 - (record.rating || 5));
      const escapedTitle = escapeHtml(record.title);
      const escapedPublisher = escapeHtml(record.publisher || '미입력');
      const escapedReview = escapeHtml(record.review || '');

      return `
        <div class="book-item-card" onclick="openBookDetail('${escapeQuotes(record.title)}', '${record.startDate}')">
          <div class="book-card-top">
            <div class="book-cover-badge" style="background: ${grad};">📖</div>
            <div class="book-title-area">
              <div class="book-title-text" title="${escapedTitle}">${escapedTitle}</div>
              <div class="book-publisher-text">${escapedPublisher}</div>
            </div>
            <div style="color: #ffbc00; font-size: 13px; font-weight: 700;">
              ${stars}
            </div>
          </div>

          <div class="book-period-badge">
            <span>📅 ${record.startDate} ~ ${record.endDate}</span>
            <span style="font-weight: 600; color: var(--naver-green-dark);">${calculateDays(record.startDate, record.endDate)}</span>
          </div>

          <div class="book-stats-row">
            <div class="stat-pill">
              책 쪽수: <strong>${(record.pageCount || 0).toLocaleString()} 쪽</strong>
            </div>
            <div class="stat-pill">
              누적: <strong>${(record.cumulativePages || 0).toLocaleString()} 쪽</strong>
            </div>
          </div>

          <p class="book-review-snippet">
            ${escapedReview}
          </p>

          <div class="book-card-footer">
            <span>등록: ${record.createdAt ? record.createdAt.slice(0, 10) : ''}</span>
            <span style="color: var(--naver-green-dark); font-weight: 600;">자세히 보기 &rarr;</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTable(list) {
    if (!list.length) {
      els.bookTableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 30px; color: var(--text-muted);">
            검색 조건에 일치하는 도서가 없습니다.
          </td>
        </tr>
      `;
      return;
    }

    els.bookTableBody.innerHTML = list.map((record, idx) => {
      const stars = '★'.repeat(record.rating || 5);
      return `
        <tr>
          <td>${idx + 1}</td>
          <td class="td-title" style="cursor: pointer; color: var(--naver-green-dark);" onclick="openBookDetail('${escapeQuotes(record.title)}', '${record.startDate}')">
            ${escapeHtml(record.title)}
          </td>
          <td>${escapeHtml(record.publisher || '-')}</td>
          <td>${record.startDate}</td>
          <td>${record.endDate}</td>
          <td style="font-weight: 600;">${(record.pageCount || 0).toLocaleString()}쪽</td>
          <td class="td-highlight">${(record.cumulativePages || 0).toLocaleString()}쪽</td>
          <td style="color: #ffbc00; font-size: 12px;">${stars}</td>
          <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(record.review)}">
            ${escapeHtml(record.review)}
          </td>
          <td>
            <button class="util-btn" style="padding: 3px 8px; font-size: 11px;" onclick="openBookDetail('${escapeQuotes(record.title)}', '${record.startDate}')">
              보기
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ================= BOOK DETAIL MODAL =================
  window.openBookDetail = function (title, startDate) {
    const record = userRecords.find(r => r.title === title && r.startDate === startDate);
    if (!record) return;

    selectedRecord = record;
    els.detailModalTitle.textContent = record.title;

    const stars = '★'.repeat(record.rating || 5) + '☆'.repeat(5 - (record.rating || 5));
    const duration = calculateDays(record.startDate, record.endDate);

    els.detailModalBody.innerHTML = `
      <div style="background-color: var(--bg-subtle); padding: 16px; border-radius: var(--radius-sm); margin-bottom: 16px; border: 1px solid var(--border-light);">
        <div style="font-size: 18px; font-weight: 800; color: var(--text-title); margin-bottom: 4px;">
          ${escapeHtml(record.title)}
        </div>
        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
          출판사: <strong>${escapeHtml(record.publisher)}</strong> | 학생: <strong>${escapeHtml(record.name)}</strong>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 13px;">
          <div>📅 독서 기간: <strong>${record.startDate} ~ ${record.endDate}</strong> <small>${duration}</small></div>
          <div>⭐ 별점: <strong style="color: #ffbc00;">${stars}</strong> (${record.rating || 5}점)</div>
          <div>📄 책 페이지: <strong>${(record.pageCount || 0).toLocaleString()} 쪽</strong></div>
          <div>📈 당시 누적 페이지: <strong style="color: var(--naver-green-dark);">${(record.cumulativePages || 0).toLocaleString()} 쪽</strong></div>
        </div>
      </div>

      <div style="margin-bottom: 8px; font-size: 14px; font-weight: 700; color: var(--text-title);">
        📝 독서 소감 및 감상
      </div>
      <div style="background-color: #ffffff; border: 1px solid var(--border-medium); border-radius: var(--radius-sm); padding: 14px; font-size: 14px; line-height: 1.7; color: var(--text-main); white-space: pre-wrap;">${escapeHtml(record.review)}</div>
      
      <div style="margin-top: 10px; font-size: 11px; color: var(--text-muted); text-align: right;">
        기록 일시: ${record.createdAt || '-'}
      </div>
    `;

    els.bookDetailModal.classList.add('active');
  };

  window.closeDetailModal = function () {
    els.bookDetailModal.classList.remove('active');
    selectedRecord = null;
  };

  async function handleDeleteCurrentRecord() {
    if (!selectedRecord || !currentUser) return;

    if (!confirm(`정말로 '${selectedRecord.title}' 독서 기록을 삭제하시겠습니까?`)) {
      return;
    }

    const gasUrl = localStorage.getItem(STORAGE_KEYS.GAS_URL);
    if (gasUrl) {
      try {
        fetchWithTimeout(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'deleteRecord',
            name: currentUser.name,
            password: currentUser.password,
            title: selectedRecord.title,
            startDate: selectedRecord.startDate
          })
        }, 5000);
      } catch (e) {
        console.warn('Apps Script delete notice:', e);
      }
    }

    // Filter out from local array
    userRecords = userRecords.filter(r => !(r.title === selectedRecord.title && r.startDate === selectedRecord.startDate));

    // Recalculate cumulative pages in chronological order
    let runningPages = 0;
    userRecords.forEach(r => {
      runningPages += (Number(r.pageCount) || 0);
      r.cumulativePages = runningPages;
    });

    saveLocalRecords(currentUser.name, userRecords);

    closeDetailModal();
    updateProfileBadgesAndStats();
    renderBookshelf();
    renderStats();
    showToast('독서 기록이 삭제되었습니다.');
  }

  // ================= STATISTICS & BADGES =================
  function renderStats() {
    const totalBooks = userRecords.length;
    const totalPages = getCurrentCumulativePages();
    const avgPages = totalBooks > 0 ? Math.round(totalPages / totalBooks) : 0;
    
    let totalRating = 0;
    userRecords.forEach(r => totalRating += (Number(r.rating) || 5));
    const avgRating = totalBooks > 0 ? (totalRating / totalBooks).toFixed(1) : '0.0';

    if (els.statBooksCount) els.statBooksCount.textContent = totalBooks;
    if (els.statCumulativePages) els.statCumulativePages.textContent = totalPages.toLocaleString();
    if (els.statAvgPages) els.statAvgPages.textContent = avgPages.toLocaleString();
    if (els.statAvgRating) els.statAvgRating.textContent = avgRating;

    // Marathon Goal (1,000 pages)
    const goal = 1000;
    const percent = Math.min(100, Math.round((totalPages / goal) * 100));
    const remain = Math.max(0, goal - totalPages);

    if (els.marathonPercent) els.marathonPercent.textContent = `${percent}%`;
    if (els.marathonFill) els.marathonFill.style.width = `${percent}%`;
    if (els.marathonCurrentPages) els.marathonCurrentPages.textContent = totalPages.toLocaleString();
    if (els.marathonRemainPages) els.marathonRemainPages.textContent = remain.toLocaleString();

    // Badges definitions
    const badges = [
      { id: 'first', name: '🌱 첫걸음 독서가', desc: '첫 1권 완독하기', unlocked: totalBooks >= 1 },
      { id: 'p100', name: '📖 100쪽 클리어', desc: '누적 100쪽 달성', unlocked: totalPages >= 100 },
      { id: 'p300', name: '🚀 300쪽 탐험가', desc: '누적 300쪽 달성', unlocked: totalPages >= 300 },
      { id: 'p500', name: '🌟 500쪽 책벌레', desc: '누적 500쪽 달성', unlocked: totalPages >= 500 },
      { id: 'p1000', name: '👑 1,000쪽 마스터', desc: '누적 1,000쪽 달성', unlocked: totalPages >= 1000 },
      { id: 'p3000', name: '🏆 3,000쪽 마라토너', desc: '누적 3,000쪽 완주', unlocked: totalPages >= 3000 },
      { id: 'writer', name: '✍️ 깊이 있는 서평가', desc: '감상문 100자 이상 작성', unlocked: userRecords.some(r => (r.review || '').length >= 100) },
      { id: 'rater', name: '⭐ 별점 평가단', desc: '별점 준 도서 3권 이상', unlocked: userRecords.filter(r => r.rating).length >= 3 }
    ];

    if (els.badgesContainer) {
      els.badgesContainer.innerHTML = badges.map(b => `
        <div class="badge-item ${b.unlocked ? 'unlocked' : 'locked'}">
          <div class="badge-icon">${b.name.split(' ')[0]}</div>
          <div class="badge-name">${b.name.split(' ').slice(1).join(' ')}</div>
          <div class="badge-condition">${b.desc}</div>
          <span class="badge-status-tag">${b.unlocked ? '달성 완료 🎉' : '진행 중 🔒'}</span>
        </div>
      `).join('');
    }
  }

  // ================= CSV EXPORT =================
  function exportToCsv() {
    if (!userRecords.length) {
      showToast('내보낼 독서 기록이 없습니다.', true);
      return;
    }

    const headers = ['이름', '책 읽기 시작한 날', '다 읽은 날', '책 제목', '출판사', '책 페이지', '누적페이지', '별점', '감상', '등록일시'];
    const rows = userRecords.map(r => [
      `"${r.name || ''}"`,
      `"${r.startDate || ''}"`,
      `"${r.endDate || ''}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.publisher || '').replace(/"/g, '""')}"`,
      r.pageCount || 0,
      r.cumulativePages || 0,
      r.rating || 5,
      `"${(r.review || '').replace(/"/g, '""')}"`,
      `"${r.createdAt || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `독서기록장_${currentUser ? currentUser.name : '학생'}_${getTodayString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('엑셀(CSV) 파일이 성공적으로 다운로드되었습니다.');
  }

  // ================= GOOGLE APPS SCRIPT SETTINGS =================
  window.openSettingsModal = function () {
    const saved = localStorage.getItem(STORAGE_KEYS.GAS_URL) || '';
    if (els.gasUrlInput) els.gasUrlInput.value = saved;
    els.settingsModal.classList.add('active');
  };

  window.closeSettingsModal = function () {
    els.settingsModal.classList.remove('active');
  };

  async function saveGasUrl() {
    const url = els.gasUrlInput.value.trim();
    if (!url) {
      showToast('올바른 Apps Script URL을 입력해주세요.', true);
      return;
    }

    if (!url.startsWith('https://script.google.com/macros/s/')) {
      showToast('올바른 Google Apps Script 배포 URL 형식이 아닙니다.', true);
      return;
    }

    els.saveGasUrlBtn.disabled = true;
    els.saveGasUrlBtn.textContent = '연동 상태 확인 중...';

    try {
      // Test ping
      const testRes = await fetchWithTimeout(url + (url.includes('?') ? '&' : '?') + 'action=ping', { method: 'GET' }, 5000);
      const json = await testRes.json();
      
      localStorage.setItem(STORAGE_KEYS.GAS_URL, url);
      updateGasStatusUI();
      closeSettingsModal();
      showToast('🎉 구글 스프레드시트와 성공적으로 연결되었습니다!');

      // If user is currently logged in, sync records
      if (currentUser) {
        syncWithAppsScript(currentUser.name, currentUser.password, false);
      }
    } catch (e) {
      // Still save if user wants, but warn
      localStorage.setItem(STORAGE_KEYS.GAS_URL, url);
      updateGasStatusUI();
      closeSettingsModal();
      showToast('URL이 저장되었습니다. (CORS 또는 권한 설정 확인 필요)', false);
    } finally {
      els.saveGasUrlBtn.disabled = false;
      els.saveGasUrlBtn.textContent = '연동 저장 및 테스트';
    }
  }

  function clearGasUrl() {
    if (confirm('Google Sheets 연동 URL을 초기화하시겠습니까? (로컬 모드로 전환됩니다)')) {
      localStorage.removeItem(STORAGE_KEYS.GAS_URL);
      if (els.gasUrlInput) els.gasUrlInput.value = '';
      updateGasStatusUI();
      closeSettingsModal();
      showToast('구글 스프레드시트 연동이 해제되어 로컬 모드로 동작합니다.');
    }
  }

  function updateGasStatusUI() {
    const gasUrl = localStorage.getItem(STORAGE_KEYS.GAS_URL);
    if (gasUrl) {
      els.gasStatusBadge.className = 'status-indicator connected';
      els.gasStatusText.textContent = '구글 시트 연동';
      els.gasStatusBadge.title = 'Google Apps Script 연결 활성화됨';
    } else {
      els.gasStatusBadge.className = 'status-indicator local';
      els.gasStatusText.textContent = '로컬 모드';
      els.gasStatusBadge.title = '현재 브라우저에 저장 중 (스프레드시트 연동 가능)';
    }
  }

  // ================= DAILY QUOTES =================
  function renderQuote() {
    const q = DAILY_QUOTES[quoteIndex];
    if (els.dailyQuoteText) els.dailyQuoteText.textContent = `"${q.text}"`;
    if (els.dailyQuoteAuthor) els.dailyQuoteAuthor.textContent = `— ${q.author}`;
  }

  window.rotateQuote = function () {
    quoteIndex = (quoteIndex + 1) % DAILY_QUOTES.length;
    renderQuote();
  };

  // ================= FETCH TIMEOUT HELPER =================
  function fetchWithTimeout(url, options = {}, timeout = 6000) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('네트워크 요청 시간 초과')), timeout))
    ]);
  }

  // ================= STRING SANITIZERS =================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // Start app on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
