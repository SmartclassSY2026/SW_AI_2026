/**
 * 计算机辅助设计AI教学助手
 * 基于腾讯元器 OpenAPI，支持学生登录、流式对话、课堂思政自动附带、飞书记录、教师后台
 */
(function () {
  "use strict";

  var MAX_PAIRS = 20;

  var DEFAULT_SETTINGS = {
    workerUrl: "https://aesthetic-squirrel-c6903e.netlify.app",
    title: "计算机辅助设计AI教学助手",
    welcomeTitle: "你好！我是 计算机辅助设计AI教学助手",
    welcomeSub: "可以问我任何关于计算机辅助设计操作的问题",
    teacherPwd: "teacher123",
    classCode: "",
  };

  var state = {
    settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    messages: [],
    isGenerating: false,
    abortController: null,
    student: null,
    records: [],
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = {};

  // ==================== Init ====================
  function init() {
    cacheElements();
    loadSettings();
    loadTheme();
    applySettingsToUI();
    setupEventListeners();

    if (window.marked) {
      marked.setOptions({ breaks: true, gfm: true });
    }

    var savedStudent = localStorage.getItem("sw_student");
    if (savedStudent) {
      try {
        state.student = JSON.parse(savedStudent);
        renderStudentInfo();
        showView("chat");
        loadMessages();
        renderMessages();
        if (state.messages.length === 0) loadHistoryFromFeishu();
      } catch (e) {
        showView("login");
      }
    } else {
      showView("login");
    }
  }

  function cacheElements() {
    var ids = [
      "loginView","chatView","teacherView","loginBtn","loginName","loginId","loginCode","loginError","loginTeacherBtn",
      "topbarTitle","topbarUser","sidebarName","sidebarId",
      "themeToggle","logoutBtn","sidebarToggle","sidebar",
      "helpBtn","exampleBtn","clearBtn","teacherSettingsBtn",
      "messages","welcomeScreen","welcomeTitle","welcomeSubtitle","suggestions",
      "messageInput","sendBtn","stopBtn","charCount",
      "settingsModal","closeSettings","cancelSettings","saveSettings",
      "setWorkerUrl",
      "teacherPwdModal","closeTeacherPwd","cancelTeacherPwd","confirmTeacherPwd","teacherPwdInput",
      "teacherBackBtn","teacherRefreshBtn","teacherSearch","teacherFilter","teacherExportBtn",
      "teacherTableBody","statStudents","statTotal","statToday",
      "exampleModal","closeExample","exampleList",
      "knowledgeGraphBtn","knowledgeGraphModal","closeKnowledgeGraph",
      "kgSearchInput","kgLevelFilter","kgChapters",
      "kgPersonalStats","kgStuStatTotal","kgStuStatAsked","kgStuStatRate","kgStuStatQuestions",
      "teacherPanelRecords","teacherPanelKg","teacherPanelDashboard",
      "kgStats","kgStatTotal","kgStatCovered","kgStatRate","kgStatCore",
      "kgSearchInputT","kgLevelFilterT","kgCoverFilterT","kgChaptersT",
      "dashTimeFilter","dashStats","dashStatStudents","dashStatTotal","dashStatAvg","dashStatActive",
      "dashBarChart","dashDoughnutChart","dashDoughnutLegend","dashRankBody",
      "toast","hljsLight","hljsDark",
    ];
    for (var i = 0; i < ids.length; i++) el[ids[i]] = $(ids[i]);
    el.teacherTabs = document.querySelectorAll(".teacher-tab");
  }

  // ==================== View Switching ====================
  function showView(name) {
    var views = ["login","chat","teacher"];
    for (var i = 0; i < views.length; i++) {
      var v = el[views[i] + "View"];
      if (v) { if (views[i] === name) v.classList.remove("hidden"); else v.classList.add("hidden"); }
    }
  }

  function renderStudentInfo() {
    if (state.student) {
      el.sidebarName.textContent = state.student.name;
      el.sidebarId.textContent = "学号: " + state.student.id;
      el.topbarUser.textContent = state.student.name + " · " + state.student.id;
    } else {
      el.sidebarName.textContent = "";
      el.sidebarId.textContent = "";
      el.topbarUser.textContent = "";
    }
  }

  // ==================== Login ====================
  function handleLogin() {
    var name = el.loginName.value.trim();
    var id = el.loginId.value.trim();
    var code = el.loginCode.value.trim();

    el.loginError.textContent = "";

    if (!name) { el.loginError.textContent = "请输入姓名"; el.loginName.focus(); return; }
    if (!id) { el.loginError.textContent = "请输入学号"; el.loginId.focus(); return; }

    if (state.settings.classCode && code !== state.settings.classCode) {
      el.loginError.textContent = "班级口令不正确";
      el.loginCode.focus();
      return;
    }

    state.student = { name: name, id: id, loginAt: new Date().toISOString() };
    localStorage.setItem("sw_student", JSON.stringify(state.student));

    renderStudentInfo();

    loadMessages();
    renderMessages();
    showView("chat");

    if (state.messages.length === 0) loadHistoryFromFeishu();
  }

  function handleLogout() {
    if (!confirm("确定要退出登录吗？")) return;
    localStorage.removeItem("sw_student");
    localStorage.removeItem("sw_messages");
    state.student = null;
    state.messages = [];
    renderStudentInfo();
    el.loginName.value = "";
    el.loginId.value = "";
    el.loginCode.value = "";
    showView("login");
  }

  // ==================== Settings ====================
  function loadSettings() {
    try {
      var s = localStorage.getItem("sw_settings");
      if (s) {
        var parsed = JSON.parse(s);
        state.settings = Object.assign({}, DEFAULT_SETTINGS, parsed);
        // 以下字段固定为默认值，不再从旧设置中读取
        state.settings.title = DEFAULT_SETTINGS.title;
        state.settings.welcomeTitle = DEFAULT_SETTINGS.welcomeTitle;
        state.settings.welcomeSub = DEFAULT_SETTINGS.welcomeSub;
        state.settings.teacherPwd = DEFAULT_SETTINGS.teacherPwd;
        state.settings.classCode = DEFAULT_SETTINGS.classCode;
      }
    } catch (e) {}
  }

  function saveSettingsToStorage() {
    try { localStorage.setItem("sw_settings", JSON.stringify(state.settings)); } catch (e) {}
  }

  function applySettingsToUI() {
    var s = state.settings;
    document.title = s.title || "计算机辅助设计AI教学助手";
    el.topbarTitle.textContent = s.title || "计算机辅助设计AI教学助手";
    el.welcomeTitle.textContent = s.welcomeTitle || "你好！我是 计算机辅助设计AI教学助手";
    el.welcomeSubtitle.textContent = s.welcomeSub || "可以问我任何关于计算机辅助设计操作的问题";
  }

  function openSettings() {
    var s = state.settings;
    el.setWorkerUrl.value = s.workerUrl || "";
    el.settingsModal.classList.remove("hidden");
  }

  function closeSettingsModal() { el.settingsModal.classList.add("hidden"); }

  function handleSaveSettings() {
    if (!el.setWorkerUrl.value.trim()) { showToast("请填写服务代理地址", "error"); el.setWorkerUrl.focus(); return; }

    state.settings = {
      workerUrl: el.setWorkerUrl.value.trim().replace(/\/$/, ""),
      title: "计算机辅助设计AI教学助手",
      welcomeTitle: "你好！我是 计算机辅助设计AI教学助手",
      welcomeSub: "可以问我任何关于计算机辅助设计操作的问题",
      teacherPwd: "teacher123",
      classCode: "",
    };
    saveSettingsToStorage();
    applySettingsToUI();
    closeSettingsModal();
    showToast("设置已保存", "success");
  }

  // ==================== Messages ====================
  function loadMessages() {
    try {
      var s = localStorage.getItem("sw_messages");
      if (s) state.messages = JSON.parse(s);
    } catch (e) { state.messages = []; }
  }

  function saveMessages() {
    try {
      var recent = state.messages.slice(-MAX_PAIRS * 2);
      localStorage.setItem("sw_messages", JSON.stringify(recent));
    } catch (e) {}
  }

  function addMessage(role, content) {
    var msg = { id: "m" + Date.now() + Math.random().toString(36).slice(2, 6), role: role, content: content, time: new Date().toISOString() };
    state.messages.push(msg);
    saveMessages();
    return msg;
  }

  function renderMessages() {
    var existing = el.messages.querySelectorAll(".message, .messages-inner");
    for (var i = 0; i < existing.length; i++) existing[i].remove();

    if (state.messages.length === 0) { el.welcomeScreen.classList.remove("hidden"); return; }
    el.welcomeScreen.classList.add("hidden");

    var inner = document.createElement("div");
    inner.className = "messages-inner";
    for (var j = 0; j < state.messages.length; j++) inner.appendChild(createMessageElement(state.messages[j]));
    el.messages.appendChild(inner);
    scrollToBottom(false);
  }

  function createMessageElement(msg) {
    var w = document.createElement("div");
    w.className = "message " + msg.role;

    var av = document.createElement("div");
    av.className = "message-avatar";
    av.textContent = msg.role === "user" ? (state.student ? state.student.name.charAt(0) : "U") : "AI";
    w.appendChild(av);

    var content = document.createElement("div");
    content.className = "message-content";

    var bubble = document.createElement("div");
    bubble.className = "message-bubble";
    if (msg.role === "assistant") {
      bubble.innerHTML = renderMarkdown(msg.content);
      postProcessStructuredAnswer(bubble);
    } else {
      bubble.textContent = msg.content;
    }
    content.appendChild(bubble);

    var meta = document.createElement("div");
    meta.className = "message-meta";
    var time = document.createElement("span");
    time.textContent = formatTime(msg.time);
    meta.appendChild(time);

    if (msg.role === "assistant" && msg.content) {
      var actions = document.createElement("div");
      actions.className = "message-actions";
      var copyBtn = document.createElement("button");
      copyBtn.className = "action-btn";
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>复制';
      copyBtn.onclick = function () { copyToClipboard(msg.content); showToast("已复制", "success"); };
      actions.appendChild(copyBtn);
      meta.appendChild(actions);
    }
    content.appendChild(meta);
    w.appendChild(content);

    if (msg.role === "assistant") enhanceCodeBlocks(bubble);
    return w;
  }

  function getOrCreateInner() {
    var inner = el.messages.querySelector(".messages-inner");
    if (!inner) {
      el.welcomeScreen.classList.add("hidden");
      inner = document.createElement("div");
      inner.className = "messages-inner";
      el.messages.appendChild(inner);
    }
    return inner;
  }

  function appendStreamingBubble() {
    var inner = getOrCreateInner();
    var w = document.createElement("div");
    w.className = "message assistant";
    w.id = "streamMsg";

    var av = document.createElement("div");
    av.className = "message-avatar";
    av.textContent = "AI";
    w.appendChild(av);

    var content = document.createElement("div");
    content.className = "message-content";
    var bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.id = "streamBubble";

    var typing = document.createElement("div");
    typing.className = "typing-indicator";
    typing.id = "typingIndicator";
    typing.innerHTML = '<span class="typing-text">思考中</span><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    bubble.appendChild(typing);

    content.appendChild(bubble);
    w.appendChild(content);
    inner.appendChild(w);
    scrollToBottom(true);
    return bubble;
  }

  function updateStreamingBubble(bubble, text) {
    var typing = bubble.querySelector("#typingIndicator");
    if (typing) typing.remove();

    bubble.dataset.raw = text;
    bubble.innerHTML = renderMarkdown(text);
    postProcessStructuredAnswer(bubble);
    enhanceCodeBlocks(bubble);
    scrollToBottom(true);
  }

  // ==================== API ====================
  function buildApiMessages() {
    var recent = state.messages.slice(-MAX_PAIRS * 2);
    // 元器 API 要求 messages 第一条必须是 user，截掉开头的 assistant/system 消息
    var startIndex = 0;
    for (var i = 0; i < recent.length; i++) {
      if (recent[i].role === "user") { startIndex = i; break; }
    }
    // 构建严格交替的消息列表：跳过连续相同角色的消息
    var result = [];
    var lastRole = null;
    for (var i = startIndex; i < recent.length; i++) {
      var role = recent[i].role;
      // 只保留 user 和 assistant，跳过 system
      if (role !== "user" && role !== "assistant") continue;
      // 跳过连续相同角色（保留第一条）
      if (role === lastRole) continue;
      // 跳过空内容
      if (!recent[i].content || !recent[i].content.trim()) continue;
      result.push({
        role: role,
        content: [{ type: "text", text: recent[i].content }],
      });
      lastRole = role;
    }
    // 确保最后一条是 user（当前要发送的问题）
    if (result.length === 0 || result[result.length - 1].role !== "user") {
      // 如果没有 user 消息，返回空让调用方处理
      return result;
    }
    return result;
  }

  function getUserId() {
    return state.student ? state.student.id : "anonymous";
  }

  async function sendMessage(text) {
    if (state.isGenerating) return;
    if (!text || !text.trim()) return;

    if (!state.settings.workerUrl) {
      showToast("请先配置服务代理地址", "error");
      return;
    }

    state.isGenerating = true;
    updateInputState();

    // 用户消息
    var userMsg = addMessage("user", text);
    getOrCreateInner().appendChild(createMessageElement(userMsg));

    // 助手流式气泡
    var bubble = appendStreamingBubble();

    var chatUrl = state.settings.workerUrl + "/api/chat";

    var body = {
      user_id: getUserId(),
      stream: true,
      messages: buildApiMessages(),
    };

    state.abortController = new AbortController();
    var fullResponse = "";
    var firstChunk = true;

    try {
      var response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: state.abortController.signal,
      });

      if (!response.ok) {
        var errText = await response.text().catch(function () { return ""; });
        var errMsg = "请求失败 (" + response.status + ")";
        try { var ej = JSON.parse(errText); if (ej.error && ej.error.message) errMsg = ej.error.message; else if (ej.message) errMsg = ej.message; } catch (_) {}
        throw new Error(errMsg);
      }

      var respType = response.headers.get("content-type") || "";

      if (respType.indexOf("text/event-stream") >= 0 || respType.indexOf("text/plain") >= 0) {
        // ===== 流式模式（Vercel）=====
        var reader = response.body.getReader();
        var decoder = new TextDecoder();
        var buffer = "";

        while (true) {
          var chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          var lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (var li = 0; li < lines.length; li++) {
            var line = lines[li].trim();
            if (!line || line.indexOf("data:") !== 0) continue;
            var data = line.slice(5).trim();
            if (data === "[DONE]") break;
            try {
              var json = JSON.parse(data);
              var delta = json.choices && json.choices[0] && json.choices[0].delta;
              var c = (delta && delta.content) || "";
              if (c) {
                if (firstChunk) { firstChunk = false; var t = bubble.querySelector("#typingIndicator"); if (t) t.remove(); }
                fullResponse += c;
                updateStreamingBubble(bubble, fullResponse, false);
              }
            } catch (e) {}
          }
        }
      } else {
        // ===== 非流式模式（腾讯云函数 SCF）=====
        var jsonData = await response.json();
        fullResponse = jsonData.content || "";
        if (!fullResponse && jsonData.choices && jsonData.choices[0]) {
          var m = jsonData.choices[0].message || jsonData.choices[0].delta || {};
          fullResponse = m.content || "";
        }
        if (!fullResponse && jsonData.raw && jsonData.raw.choices && jsonData.raw.choices[0]) {
          var m2 = jsonData.raw.choices[0].message || jsonData.raw.choices[0].delta || {};
          fullResponse = m2.content || "";
        }
        var t2 = bubble.querySelector("#typingIndicator");
        if (t2) t2.remove();
        if (fullResponse) {
          updateStreamingBubble(bubble, fullResponse, false);
        }
      }

      if (!fullResponse) {
        updateStreamingBubble(bubble, "（未收到回复，请检查智能体配置或稍后重试）", false);
        bubble.classList.add("message-error");
      }

      // 保存消息
      var assistantMsg = addMessage("assistant", fullResponse);
      saveMessages();

      // 替换流式气泡为正式消息
      var streamMsg = $("streamMsg");
      if (streamMsg) streamMsg.replaceWith(createMessageElement(assistantMsg));

      // 发送记录到飞书
      sendRecord(text, fullResponse, "对话");

    } catch (err) {
      if (err.name === "AbortError") {
        if (fullResponse) {
          updateStreamingBubble(bubble, fullResponse + "\n\n_（已停止生成）_", false);
          addMessage("assistant", fullResponse);
        } else {
          updateStreamingBubble(bubble, "（已取消）", false);
        }
      } else {
        console.error("API error:", err);
        updateStreamingBubble(bubble, "⚠ " + err.message, false);
        bubble.classList.add("message-error");
      }
      var sm = $("streamMsg");
      if (sm) sm.removeAttribute("id");
    } finally {
      state.isGenerating = false;
      state.abortController = null;
      updateInputState();
      el.messageInput.focus();
    }
  }

  function stopGeneration() {
    if (state.abortController) state.abortController.abort();
  }

  // ==================== Feishu Records ====================
  async function sendRecord(question, answer, type) {
    if (!state.settings.workerUrl) return;
    if (!state.student) return;

    try {
      var response = await fetch(state.settings.workerUrl + "/api/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: state.student.name,
          student_id: state.student.id,
          question: question,
          answer: answer.substring(0, 500),
          type: type,
          time: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        var errText = await response.text().catch(function () { return ""; });
        var errMsg = "飞书记录失败 (" + response.status + ")";
        try { var ej = JSON.parse(errText); if (ej.error) errMsg = "飞书记录失败: " + ej.error; } catch (_) {}
        console.warn(errMsg);
      }
    } catch (e) {
      console.warn("记录发送失败:", e);
    }
  }

  async function loadHistoryFromFeishu() {
    if (!state.settings.workerUrl) return;
    if (!state.student) return;

    try {
      var url = state.settings.workerUrl + "/api/records?student_id=" + encodeURIComponent(state.student.id);
      var response = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
      if (!response.ok) return;
      var data = await response.json();
      var records = data.records || [];
      if (records.length === 0) return;

      // 把飞书记录转为消息列表（先问后答，按时间正序）
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.question) addMessage("user", r.question);
        if (r.answer) addMessage("assistant", r.answer);
      }
      saveMessages();
      renderMessages();
      showToast("已加载最近 " + records.length + " 条历史记录", "success");
    } catch (e) {
      console.warn("加载历史记录失败:", e);
    }
  }

  async function fetchRecords() {
    if (!state.settings.workerUrl) {
      showToast("请先配置服务代理地址", "error");
      return;
    }

    el.teacherTableBody.innerHTML = '<tr class="teacher-empty"><td colspan="5">加载中...</td></tr>';

    try {
      var response = await fetch(state.settings.workerUrl + "/api/records", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Teacher-Auth": "teacher123",
        },
      });
      if (!response.ok) throw new Error("请求失败");
      var data = await response.json();
      state.records = data.records || data.items || data || [];
      if (!Array.isArray(state.records)) state.records = [];
      renderTeacherTable(state.records);
      updateStats(state.records);
    } catch (e) {
      el.teacherTableBody.innerHTML = '<tr class="teacher-empty"><td colspan="5">加载失败，请检查 Worker 代理地址配置</td></tr>';
      console.error("Fetch records error:", e);
    }
  }

  function updateStats(records) {
    var students = {};
    var today = new Date().toDateString();
    var todayCount = 0;
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.student_id) students[r.student_id] = true;
      if (r.time && new Date(r.time).toDateString() === today) todayCount++;
    }
    el.statStudents.textContent = Object.keys(students).length;
    el.statTotal.textContent = records.length;
    el.statToday.textContent = todayCount;
  }

  function renderTeacherTable(records) {
    var search = el.teacherSearch.value.trim().toLowerCase();
    var filter = el.teacherFilter.value;

    var filtered = records.filter(function (r) {
      if (filter && r.type !== filter) return false;
      if (search) {
        var text = ((r.student_name || "") + (r.question || "") + (r.student_id || "")).toLowerCase();
        if (text.indexOf(search) === -1) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      el.teacherTableBody.innerHTML = '<tr class="teacher-empty"><td colspan="5">暂无记录</td></tr>';
      return;
    }

    var html = "";
    for (var i = 0; i < filtered.length; i++) {
      var r = filtered[i];
      var time = r.time ? formatDateTime(r.time) : "--";
      var name = escapeHtml(r.student_name || "--");
      var sid = escapeHtml(r.student_id || "--");
      var q = escapeHtml(r.question || "--");
      var typeTag = '<span class="tag tag-operation">对话</span>';
      html += "<tr><td>" + time + "</td><td>" + name + "</td><td>" + sid + "</td><td class='q'>" + q + "</td><td>" + typeTag + "</td></tr>";
    }
    el.teacherTableBody.innerHTML = html;
  }

  function exportCSV() {
    if (state.records.length === 0) { showToast("暂无记录可导出", "error"); return; }
    var csv = "\ufeff时间,学生,学号,问题,类型\n";
    for (var i = 0; i < state.records.length; i++) {
      var r = state.records[i];
      csv += (r.time ? formatDateTime(r.time) : "") + "," + (r.student_name || "") + "," + (r.student_id || "") + ',"' + (r.question || "").replace(/"/g, '""') + '",' + (r.type || "对话") + "\n";
    }
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "学生提问记录_" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("已导出", "success");
  }

  // ==================== Teacher ====================
  function openTeacherPwd() {
    el.teacherPwdInput.value = "";
    el.teacherPwdModal.classList.remove("hidden");
    el.teacherPwdInput.focus();
  }

  function verifyTeacherPwd() {
    var pwd = el.teacherPwdInput.value.trim();
    if (pwd !== "teacher123") {
      showToast("密码错误", "error");
      el.teacherPwdInput.focus();
      return;
    }
    el.teacherPwdModal.classList.add("hidden");
    showView("teacher");
    fetchRecords();
  }

  // ==================== Markdown ====================
  function renderMarkdown(text) {
    if (!text) return "";
    // 清理知识库引用标记，如 [1]、[2]、[1,2]、[1,2,3] 等
    text = text.replace(/\[\s*\d+(?:\s*,\s*\d+)*\s*\]/g, "");
    // 清理被元器去方括号后残留的孤立数字编号（如"完成 1 2 3 5"），匹配3-5个连续数字
    text = text.replace(/(\S)\s+\d+(?:\s+\d+){2,4}(?=\s*[。，！？\n]|$)/g, "$1");
    // 统一三段式标题：把【操作步骤】、**操作步骤** 等 → ### 操作步骤
    text = text.replace(/(?:^|\n)\s*(?:【|###\s*|\*\*\s*)(操作步骤|易错点提醒|思政小课堂)(?:】|\s*\*\*)\s*(?=\n|$)/g, "\n### $1\n");
    try {
      var html;
      if (window.marked) html = marked.parse(text);
      else html = escapeHtml(text).replace(/\n/g, "<br>");
      if (window.DOMPurify) html = DOMPurify.sanitize(html);
      if (window.hljs) {
        var temp = document.createElement("div");
        temp.innerHTML = html;
        var blocks = temp.querySelectorAll("pre code");
        for (var i = 0; i < blocks.length; i++) { try { hljs.highlightElement(blocks[i]); } catch (e) {} }
        html = temp.innerHTML;
      }
      return html;
    } catch (e) {
      return escapeHtml(text).replace(/\n/g, "<br>");
    }
  }

  // 后处理：把识别到的三段标题（操作步骤/易错点提醒/思政小课堂）包成卡片
  function postProcessStructuredAnswer(bubble) {
    var headings = bubble.querySelectorAll("h1, h2, h3, h4");
    if (headings.length === 0) return;

    var icons = { operation: "📋 ", tips: "⚠️ ", sizheng: "🎯 " };
    var labels = { operation: "操作步骤", tips: "易错点提醒", sizheng: "思政小课堂" };

    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      var text = (h.textContent || "").trim();
      var type = null;
      if (text.indexOf("操作步骤") >= 0 && text.length < 20) type = "operation";
      else if (text.indexOf("易错点") >= 0 && text.length < 20) type = "tips";
      else if (text.indexOf("思政") >= 0 && text.length < 20) type = "sizheng";
      if (!type) continue;

      // 标题后面的内容，直到下一个 h1-h4，作为 section-body
      var wrapper = document.createElement("div");
      wrapper.className = "answer-section section-" + type;

      var headerDiv = document.createElement("div");
      headerDiv.className = "section-header";
      headerDiv.textContent = icons[type] + labels[type];
      wrapper.appendChild(headerDiv);

      var bodyDiv = document.createElement("div");
      bodyDiv.className = "section-body";
      var sibling = h.nextElementSibling;
      while (sibling && !sibling.matches("h1, h2, h3, h4")) {
        var next = sibling.nextElementSibling;
        bodyDiv.appendChild(sibling);
        sibling = next;
      }
      wrapper.appendChild(bodyDiv);

      h.parentNode.replaceChild(wrapper, h);
    }
  }

  function enhanceCodeBlocks(container) {
    var pres = container.querySelectorAll("pre");
    for (var i = 0; i < pres.length; i++) {
      var pre = pres[i];
      if (pre.parentElement.classList.contains("code-block-wrapper")) continue;
      var wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      var btn = document.createElement("button");
      btn.className = "code-copy-btn";
      btn.textContent = "复制";
      btn.onclick = function (pre) {
        return function () {
          var code = pre.querySelector("code");
          copyToClipboard(code ? code.textContent : pre.textContent);
          var b = this; b.textContent = "已复制";
          setTimeout(function () { b.textContent = "复制"; }, 2000);
        };
      }(pre);
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrapper.appendChild(btn);
    }
  }

  // ==================== Utils ====================
  function escapeHtml(text) {
    var d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function formatTime(iso) {
    try { var d = new Date(iso); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
    catch (e) { return ""; }
  }

  function formatDateTime(iso) {
    try {
      var d = new Date(iso);
      return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    } catch (e) { return ""; }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    else fallbackCopy(text);
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function scrollToBottom(smooth) {
    requestAnimationFrame(function () {
      el.messages.scrollTo({ top: el.messages.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }

  function showToast(msg, type) {
    el.toast.textContent = msg;
    el.toast.className = "toast" + (type ? " " + type : "");
    el.toast.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.toast.classList.add("hidden"); }, 2500);
  }

  function updateInputState() {
    if (state.isGenerating) {
      el.sendBtn.classList.add("hidden"); el.stopBtn.classList.remove("hidden");
      el.messageInput.disabled = true;
    } else {
      el.sendBtn.classList.remove("hidden"); el.stopBtn.classList.add("hidden");
      el.messageInput.disabled = false;
    }
  }

  function autoResize() {
    var ta = el.messageInput;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    el.charCount.textContent = ta.value.length > 0 ? ta.value.length + " 字" : "";
  }

  function clearMessages() {
    if (state.messages.length === 0) return;
    if (!confirm("确定要清空所有对话记录吗？")) return;
    state.messages = [];
    saveMessages();
    renderMessages();
    showToast("对话已清空", "success");
  }

  // ==================== Theme ====================
  function loadTheme() {
    var theme = localStorage.getItem("sw_theme") || "light";
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sw_theme", theme);
    if (el.hljsLight && el.hljsDark) {
      if (theme === "dark") { el.hljsLight.disabled = true; el.hljsDark.disabled = false; }
      else { el.hljsLight.disabled = false; el.hljsDark.disabled = true; }
    }
  }

  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme");
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  // ==================== Events ====================
  function setupEventListeners() {
    el.loginBtn.addEventListener("click", handleLogin);
    el.loginId.addEventListener("keydown", function (e) { if (e.key === "Enter") handleLogin(); });
    el.loginCode.addEventListener("keydown", function (e) { if (e.key === "Enter") handleLogin(); });

    el.logoutBtn.addEventListener("click", handleLogout);
    el.themeToggle.addEventListener("click", toggleTheme);
    el.teacherSettingsBtn.addEventListener("click", openSettings);
    el.closeSettings.addEventListener("click", closeSettingsModal);
    el.cancelSettings.addEventListener("click", closeSettingsModal);
    el.saveSettings.addEventListener("click", handleSaveSettings);
    el.settingsModal.addEventListener("click", function (e) { if (e.target === el.settingsModal) closeSettingsModal(); });

    el.sendBtn.addEventListener("click", handleSend);
    el.stopBtn.addEventListener("click", stopGeneration);
    el.messageInput.addEventListener("input", autoResize);
    el.messageInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    el.suggestions.addEventListener("click", function (e) {
      var card = e.target.closest(".suggestion-card");
      if (card) { el.messageInput.value = card.dataset.text; autoResize(); handleSend(); }
    });

    el.clearBtn.addEventListener("click", clearMessages);
    el.helpBtn.addEventListener("click", function () { window.open("https://help.solidworks.com/2026/chinese-simplified/SolidWorks/sldworks/r_welcome_sw_online_help.htm", "_blank"); });
    el.exampleBtn.addEventListener("click", function () { el.exampleModal.classList.remove("hidden"); });
    el.closeExample.addEventListener("click", function () { el.exampleModal.classList.add("hidden"); });
    el.exampleModal.addEventListener("click", function (e) { if (e.target === el.exampleModal) el.exampleModal.classList.add("hidden"); });
    el.exampleList.addEventListener("click", function (e) {
      var item = e.target.closest(".example-item");
      if (item) { el.exampleModal.classList.add("hidden"); el.messageInput.value = item.dataset.text; autoResize(); handleSend(); }
    });

    el.loginTeacherBtn.addEventListener("click", openTeacherPwd);
    el.closeTeacherPwd.addEventListener("click", function () { el.teacherPwdModal.classList.add("hidden"); });
    el.cancelTeacherPwd.addEventListener("click", function () { el.teacherPwdModal.classList.add("hidden"); });
    el.confirmTeacherPwd.addEventListener("click", verifyTeacherPwd);
    el.teacherPwdInput.addEventListener("keydown", function (e) { if (e.key === "Enter") verifyTeacherPwd(); });
    el.teacherPwdModal.addEventListener("click", function (e) { if (e.target === el.teacherPwdModal) el.teacherPwdModal.classList.add("hidden"); });

    el.teacherBackBtn.addEventListener("click", function () { showView("login"); });
    el.teacherRefreshBtn.addEventListener("click", fetchRecords);
    el.teacherSearch.addEventListener("input", function () { renderTeacherTable(state.records); });
    el.teacherFilter.addEventListener("change", function () { renderTeacherTable(state.records); });
    el.teacherExportBtn.addEventListener("click", exportCSV);

    el.sidebarToggle.addEventListener("click", function () { el.sidebar.classList.toggle("open"); });

    // 知识图谱（学生端只读）
    el.knowledgeGraphBtn.addEventListener("click", openStudentKG);
    el.closeKnowledgeGraph.addEventListener("click", closeStudentKG);
    el.knowledgeGraphModal.addEventListener("click", function (e) { if (e.target === el.knowledgeGraphModal) closeStudentKG(); });
    el.kgSearchInput.addEventListener("input", function () { renderStudentKG(); });
    el.kgLevelFilter.addEventListener("click", function (e) {
      var btn = e.target.closest(".kg-level-btn"); if (!btn) return;
      for (var i = 0; i < el.kgLevelFilter.children.length; i++) el.kgLevelFilter.children[i].classList.remove("active");
      btn.classList.add("active"); renderStudentKG();
    });

    // 教师后台 tab 切换
    for (var ti = 0; ti < el.teacherTabs.length; ti++) {
      el.teacherTabs[ti].addEventListener("click", function (b) {
        return function () { switchTeacherTab(b.dataset.tab); };
      }(el.teacherTabs[ti]));
    }

    // 教师知识图谱筛选
    el.kgSearchInputT.addEventListener("input", function () { renderTeacherKG(); });
    el.kgLevelFilterT.addEventListener("click", function (e) {
      var btn = e.target.closest(".kg-level-btn"); if (!btn) return;
      for (var i = 0; i < el.kgLevelFilterT.children.length; i++) el.kgLevelFilterT.children[i].classList.remove("active");
      btn.classList.add("active"); renderTeacherKG();
    });
    el.kgCoverFilterT.addEventListener("click", function (e) {
      var btn = e.target.closest(".kg-level-btn"); if (!btn) return;
      for (var i = 0; i < el.kgCoverFilterT.children.length; i++) el.kgCoverFilterT.children[i].classList.remove("active");
      btn.classList.add("active"); renderTeacherKG();
    });

    // 评价看板时间筛选
    el.dashTimeFilter.addEventListener("click", function (e) {
      var btn = e.target.closest(".dash-time-btn"); if (!btn) return;
      for (var i = 0; i < el.dashTimeFilter.children.length; i++) el.dashTimeFilter.children[i].classList.remove("active");
      btn.classList.add("active"); renderDashboard();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!el.settingsModal.classList.contains("hidden")) closeSettingsModal();
        if (!el.teacherPwdModal.classList.contains("hidden")) el.teacherPwdModal.classList.add("hidden");
        if (!el.exampleModal.classList.contains("hidden")) el.exampleModal.classList.add("hidden");
        if (!el.knowledgeGraphModal.classList.contains("hidden")) closeStudentKG();
      }
    });
  }

  function handleSend() {
    var text = el.messageInput.value.trim();
    if (!text || state.isGenerating) return;
    el.messageInput.value = "";
    autoResize();
    sendMessage(text);
  }

  // ==================== Knowledge Graph (shared data layer) ====================
  // 构建扁平化知识点索引，每个点带从名称中提取的关键词（3-4字滑动窗口+整名）
  function buildPointIndex() {
    if (buildPointIndex._cache) return buildPointIndex._cache;
    var list = [];
    var chapters = (typeof KNOWLEDGE_GRAPH !== "undefined" ? KNOWLEDGE_GRAPH : { chapters: [] }).chapters;
    for (var ci = 0; ci < chapters.length; ci++) {
      var ch = chapters[ci];
      for (var si = 0; si < ch.sections.length; si++) {
        var sec = ch.sections[si];
        for (var gi = 0; gi < sec.groups.length; gi++) {
          var g = sec.groups[gi];
          for (var pi = 0; pi < g.points.length; pi++) {
            var p = g.points[pi];
            list.push({ chapter: ch, point: p, name: p.name, level: p.level, kws: extractKeywords(p.name) });
          }
        }
      }
    }
    buildPointIndex._cache = list;
    return list;
  }

  function extractKeywords(name) {
    var kws = [];
    if (name) kws.push({ w: name, s: 50 });
    for (var i = 0; i + 4 <= name.length; i++) kws.push({ w: name.substr(i, 4), s: 20 });
    for (var i2 = 0; i2 + 3 <= name.length; i2++) kws.push({ w: name.substr(i2, 3), s: 8 });
    for (var i3 = 0; i3 + 2 <= name.length; i3++) {
      var w2 = name.substr(i3, 2);
      if (STOPWORDS[w2]) continue;
      kws.push({ w: w2, s: 1 });
    }
    return kws;
  }

  // 停用词：通用动词/疑问词，不参与知识点匹配
  var STOPWORDS = { "创建":1,"删除":1,"怎么":1,"如何":1,"怎样":1,"什么":1,"操作":1,"用":1,"做":1,"的":1,"了":1,"是":1,"在":1,"我":1,"你":1,"他":1,"她":1,"它":1,"和":1,"与":1,"或":1,"中":1,"上":1,"下":1,"里":1,"了":1,"吗":1,"呢":1,"啊":1,"吧":1,"呢":1,"啊":1,"呢":1,"什么":1,"哪些":1,"多少":1,"哪":1,"些":1,"这":1,"那":1,"这个":1,"那个":1,"一些":1,"全部":1,"的":1,"之":1,"了":1,"啊":1,"哈":1,"哦":1 };

  // 一条提问只匹配一个最相关的知识点
  function matchQuestionToPoint(question) {
    if (!question) return null;
    var points = buildPointIndex();
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var score = 0;
      for (var ki = 0; ki < p.kws.length; ki++) {
        if (question.indexOf(p.kws[ki].w) >= 0) score += p.kws[ki].s;
      }
      if (score > bestScore) { bestScore = score; best = p; }
      else if (score === bestScore && score > 0 && best && p.name.length < best.name.length) { best = p; }
    }
    return bestScore > 0 ? best : null;
  }

  // 计算所有知识点被问次数
  function computeHeat(records) {
    var points = buildPointIndex();
    var heat = {};
    for (var i = 0; i < points.length; i++) heat[points[i].name] = 0;
    for (var r = 0; r < records.length; r++) {
      var m = matchQuestionToPoint(records[r].question);
      if (m) heat[m.name]++;
    }
    return heat;
  }

  // 按时间范围过滤记录
  function filterByTime(records, range) {
    var now = new Date();
    var start = new Date();
    if (range === "week") {
      var dow = now.getDay() || 7;
      start.setDate(now.getDate() - dow + 1);
      start.setHours(0, 0, 0, 0);
    } else if (range === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === "year") {
      start = new Date(now.getFullYear(), 0, 1);
    }
    return records.filter(function (r) {
      if (!r.time) return false;
      var t = new Date(r.time);
      return t >= start && t <= now;
    });
  }

  // ==================== Student Knowledge Graph (只读，无热度) ====================
  function openStudentKG() {
    el.knowledgeGraphModal.classList.remove("hidden");
    renderStudentKG();
  }
  function closeStudentKG() { el.knowledgeGraphModal.classList.add("hidden"); }

  function renderStudentKG() {
    // 统计该学生自己问过的内容（从 state.messages 提取 user 提问）
    var points = buildPointIndex();
    var total = points.length;
    var userQuestions = [];
    var seenQ = {};
    for (var mi = 0; mi < state.messages.length; mi++) {
      var m = state.messages[mi];
      if (m && m.role === "user" && m.content && !seenQ[m.content]) {
        seenQ[m.content] = true;
        userQuestions.push(m.content);
      }
    }
    var askedSet = {};
    for (var qi = 0; qi < userQuestions.length; qi++) {
      var pt = matchQuestionToPoint(userQuestions[qi]);
      if (pt) askedSet[pt.name] = true;
    }
    var askedCount = 0;
    for (var k in askedSet) askedCount++;
    if (el.kgStuStatTotal) el.kgStuStatTotal.textContent = total;
    if (el.kgStuStatAsked) el.kgStuStatAsked.textContent = askedCount;
    if (el.kgStuStatRate) el.kgStuStatRate.textContent = (total ? Math.round(askedCount * 100 / total) : 0) + "%";
    if (el.kgStuStatQuestions) el.kgStuStatQuestions.textContent = userQuestions.length;

    var search = (el.kgSearchInput.value || "").trim();
    var activeLevelBtn = el.kgLevelFilter.querySelector(".kg-level-btn.active");
    var level = activeLevelBtn ? activeLevelBtn.dataset.level : "all";

    el.kgChapters.innerHTML = buildKGHTML(search, level, "student", null);
    bindChapterToggle(el.kgChapters);
  }

  // ==================== Teacher Tabs ====================
  function switchTeacherTab(name) {
    for (var i = 0; i < el.teacherTabs.length; i++) {
      var t = el.teacherTabs[i];
      if (t.dataset.tab === name) t.classList.add("active"); else t.classList.remove("active");
    }
    el.teacherPanelRecords.classList.toggle("hidden", name !== "records");
    el.teacherPanelKg.classList.toggle("hidden", name !== "kg");
    el.teacherPanelDashboard.classList.toggle("hidden", name !== "dashboard");
    if (name === "kg") renderTeacherKG();
    else if (name === "dashboard") renderDashboard();
  }

  // ==================== Teacher Knowledge Graph (带热度+覆盖) ====================
  function renderTeacherKG() {
    var heat = computeHeat(state.records || []);
    var points = buildPointIndex();
    var total = points.length;
    var covered = 0;
    for (var i = 0; i < points.length; i++) if (heat[points[i].name] > 0) covered++;
    var coreCount = 0;
    for (var j = 0; j < points.length; j++) if (points[j].level === "core") coreCount++;
    el.kgStatTotal.textContent = total;
    el.kgStatCovered.textContent = covered;
    el.kgStatRate.textContent = (total ? Math.round(covered * 100 / total) : 0) + "%";
    el.kgStatCore.textContent = coreCount;

    var search = (el.kgSearchInputT.value || "").trim();
    var activeLevelBtn = el.kgLevelFilterT.querySelector(".kg-level-btn.active");
    var level = activeLevelBtn ? activeLevelBtn.dataset.level : "all";
    var activeCoverBtn = el.kgCoverFilterT.querySelector(".kg-level-btn.active");
    var cover = activeCoverBtn ? activeCoverBtn.dataset.cover : "all";

    el.kgChaptersT.innerHTML = buildKGHTML(search, level, "teacher", { heat: heat, cover: cover });
    bindChapterToggle(el.kgChaptersT);
  }

  // ==================== Evaluation Dashboard ====================
  var dashCharts = { bar: null, doughnut: null };
  function renderDashboard() {
    var activeBtn = el.dashTimeFilter.querySelector(".dash-time-btn.active");
    var range = activeBtn ? activeBtn.dataset.range : "week";
    var records = filterByTime(state.records || [], range);
    var students = {}, daySet = {}, activeStu = {};
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.student_id) { students[r.student_id] = true; activeStu[r.student_id] = (activeStu[r.student_id] || 0) + 1; }
      if (r.time) daySet[new Date(r.time).toDateString()] = true;
    }
    var days = Math.max(Object.keys(daySet).length, 1);
    var activeCount = 0;
    for (var k in activeStu) if (activeStu[k] >= 3) activeCount++;
    el.dashStatStudents.textContent = Object.keys(students).length;
    el.dashStatTotal.textContent = records.length;
    el.dashStatAvg.textContent = (records.length / days).toFixed(1);
    el.dashStatActive.textContent = activeCount;

    // 知识点频次
    var heat = computeHeat(records);
    var points = buildPointIndex();
    var items = [];
    for (var pi = 0; pi < points.length; pi++) {
      if (heat[points[pi].name] > 0) items.push({ name: points[pi].name, count: heat[points[pi].name], chapter: points[pi].chapter });
    }
    items.sort(function (a, b) { return b.count - a.count; });
    var top = items.slice(0, 15);
    renderBarChart(top);
    renderDoughnut(items);
    renderRankTable(records);
  }

  function renderBarChart(top) {
    if (dashCharts.bar) { dashCharts.bar.destroy(); dashCharts.bar = null; }
    if (!window.Chart) return;
    var ctx = el.dashBarChart.getContext("2d");
    var labels = top.map(function (x) { return x.name; });
    var data = top.map(function (x) { return x.count; });
    var colors = top.map(function (x) { return x.chapter.color; });
    var isDark = document.documentElement.getAttribute("data-theme") === "dark";
    var gridColor = isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)";
    var textColor = isDark ? "#cbd5e1" : "#475569";
    dashCharts.bar = new Chart(ctx, {
      type: "bar",
      data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderRadius: 4 }] },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
          y: { ticks: { color: textColor, font: { size: 12 } }, grid: { display: false } }
        }
      }
    });
  }

  function renderDoughnut(items) {
    if (dashCharts.doughnut) { dashCharts.doughnut.destroy(); dashCharts.doughnut = null; }
    var chapters = (typeof KNOWLEDGE_GRAPH !== "undefined" ? KNOWLEDGE_GRAPH : { chapters: [] }).chapters;
    var byCh = {};
    for (var i = 0; i < items.length; i++) {
      var cn = items[i].chapter.name; byCh[cn] = (byCh[cn] || 0) + items[i].count;
    }
    var labels = [], data = [], colors = [];
    for (var ci = 0; ci < chapters.length; ci++) {
      var ch = chapters[ci];
      if (byCh[ch.name]) { labels.push(ch.name); data.push(byCh[ch.name]); colors.push(ch.color); }
    }
    if (!window.Chart) return;
    var ctx = el.dashDoughnutChart.getContext("2d");
    if (data.length === 0) {
      el.dashDoughnutLegend.innerHTML = '<div class="dash-legend-row" style="color:var(--text-3)">暂无数据</div>';
      dashCharts.doughnut = new Chart(ctx, {
        type: "doughnut",
        data: { labels: ["暂无数据"], datasets: [{ data: [1], backgroundColor: ["#E2E8F0"], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, cutout: "65%" }
      });
      return;
    }
    var total = data.reduce(function (a, b) { return a + b; }, 0);
    dashCharts.doughnut = new Chart(ctx, {
      type: "doughnut",
      data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "60%" }
    });
    var html = "";
    for (var li = 0; li < labels.length; li++) {
      var pct = total ? Math.round(data[li] * 100 / total) : 0;
      html += '<div class="dash-legend-row"><span class="dash-legend-dot" style="background:' + colors[li] + '"></span><span class="dash-legend-name">' + labels[li] + '</span><span class="dash-legend-val">' + data[li] + '次 · ' + pct + '%</span></div>';
    }
    el.dashDoughnutLegend.innerHTML = html;
  }

  function renderRankTable(records) {
    var stMap = {};  // sid -> {name, count, points:Set, lastTime}
    var heat = computeHeat(records);
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (!r.student_id) continue;
      if (!stMap[r.student_id]) stMap[r.student_id] = { name: r.student_name || "--", sid: r.student_id, count: 0, points: {}, lastTime: r.time || "" };
      stMap[r.student_id].count++;
      var m = matchQuestionToPoint(r.question);
      if (m) stMap[r.student_id].points[m.name] = true;
      if (r.time && r.time > stMap[r.student_id].lastTime) stMap[r.student_id].lastTime = r.time;
    }
    var arr = [];
    for (var k in stMap) {
      var s = stMap[k];
      arr.push({ name: s.name, sid: s.sid, count: s.count, pointCount: Object.keys(s.points).length, lastTime: s.lastTime });
    }
    arr.sort(function (a, b) { return b.count - a.count; });
    if (arr.length === 0) {
      el.dashRankBody.innerHTML = '<tr class="teacher-empty"><td colspan="6">暂无数据</td></tr>';
      return;
    }
    var html = "";
    for (var ri = 0; ri < arr.length; ri++) {
      var x = arr[ri];
      var rankClass = ri < 3 ? "rank-" + (ri + 1) : "";
      var medal = ri === 0 ? "🥇 " : (ri === 1 ? "🥈 " : (ri === 2 ? "🥉 " : ""));
      html += '<tr class="' + rankClass + '">'
        + '<td class="rank-no">' + (medal || (ri + 1)) + '</td>'
        + '<td>' + escapeHtml(x.name) + '</td>'
        + '<td>' + escapeHtml(x.sid) + '</td>'
        + '<td>' + x.count + '</td>'
        + '<td>' + x.pointCount + '</td>'
        + '<td>' + (x.lastTime ? formatDateTime(x.lastTime) : "--") + '</td>'
        + '</tr>';
    }
    el.dashRankBody.innerHTML = html;
  }

  // ==================== KG HTML Builder ====================
  function buildKGHTML(search, level, mode, opts) {
    var chapters = (typeof KNOWLEDGE_GRAPH !== "undefined" ? KNOWLEDGE_GRAPH : { chapters: [] }).chapters;
    var heat = (opts && opts.heat) || {};
    var cover = (opts && opts.cover) || "all";
    var showHeat = mode === "teacher";
    var html = "";
    for (var ci = 0; ci < chapters.length; ci++) {
      var ch = chapters[ci];
      var chapTotal = 0, chapCovered = 0, chapCore = 0;
      var hasVisiblePoint = false;
      for (var si = 0; si < ch.sections.length; si++) {
        var sec = ch.sections[si];
        for (var gi = 0; gi < sec.groups.length; gi++) {
          var g = sec.groups[gi];
          for (var pi = 0; pi < g.points.length; pi++) {
            var p = g.points[pi];
            if (p.level === "core") chapCore++;
            chapTotal++;
            if (heat[p.name] > 0) chapCovered++;
            if (matchesKGFilter(p, search, level, cover, heat)) hasVisiblePoint = true;
          }
        }
      }
      if (search || level !== "all" || cover !== "all") {
        if (!hasVisiblePoint) continue;
      }
      var rate = chapTotal ? Math.round(chapCovered * 100 / chapTotal) : 0;
      var rateBar = showHeat
        ? '<div class="kg-chapter-progress" title="覆盖率 ' + rate + '%"><div class="kg-chapter-progress-bar" style="width:' + rate + '%; background:' + ch.color + '"></div></div>'
        : "";
      var rateMeta = showHeat ? '<span class="kg-chapter-meta">覆盖 ' + chapCovered + '/' + chapTotal + ' · ' + rate + '%</span>' : '<span class="kg-chapter-meta">' + chapTotal + ' 个知识点</span>';
      html += '<div class="kg-chapter">'
        + '<div class="kg-chapter-head">'
        +   '<span class="kg-chapter-bar" style="background:' + ch.color + '"></span>'
        +   '<span class="kg-chapter-title">第' + ch.id + '章 · ' + escapeHtml(ch.name) + '</span>'
        +   rateMeta
        +   rateBar
        +   '<span class="kg-chapter-toggle">▶</span>'
        + '</div>'
        + '<div class="kg-chapter-body">';
      for (var si2 = 0; si2 < ch.sections.length; si2++) {
        var sec2 = ch.sections[si2];
        html += '<div class="kg-section">'
          + '<div class="kg-section-title">' + escapeHtml(sec2.id) + ' ' + escapeHtml(sec2.name) + '</div>';
        for (var gi2 = 0; gi2 < sec2.groups.length; gi2++) {
          var g2 = sec2.groups[gi2];
          var pointsHTML = "";
          for (var pi2 = 0; pi2 < g2.points.length; pi2++) {
            var p2 = g2.points[pi2];
            if (!matchesKGFilter(p2, search, level, cover, heat)) continue;
            var lm = LEVEL_META[p2.level] || { label: p2.level, color: "#5F5E5A", bg: "#F1EFE8" };
            var h = heat[p2.name] || 0;
            var covered = h > 0;
            var cls = (showHeat ? (covered ? "covered" : "uncovered") : "");
            var heatHTML = showHeat ? '<span class="kg-heat">' + (covered ? "被问 " + h + " 次" : "未被问及") + '</span>' : "";
            pointsHTML += '<span class="kg-point ' + cls + '" style="background:' + lm.bg + '; color:' + lm.color + '">'
              +   '<span class="kg-tag" style="background:' + lm.color + '; color:#fff">' + lm.label + '</span>'
              +   escapeHtml(p2.name)
              +   heatHTML
              + '</span>';
          }
          if (!pointsHTML) continue;
          html += '<div class="kg-group"><div class="kg-group-name">' + escapeHtml(g2.id) + ' ' + escapeHtml(g2.name) + '</div><div class="kg-point-list">' + pointsHTML + '</div></div>';
        }
        html += '</div>';
      }
      html += '</div></div>';
    }
    if (!html) return '<div style="text-align:center;color:var(--text-3);padding:30px 0">没有匹配的知识点</div>';
    return html;
  }

  function matchesKGFilter(p, search, level, cover, heat) {
    if (level !== "all" && p.level !== level) return false;
    if (search && p.name.indexOf(search) === -1) return false;
    if (cover === "covered" && !(heat[p.name] > 0)) return false;
    if (cover === "uncovered" && (heat[p.name] > 0)) return false;
    return true;
  }

  function bindChapterToggle(container) {
    var heads = container.querySelectorAll(".kg-chapter-head");
    for (var i = 0; i < heads.length; i++) {
      heads[i].addEventListener("click", function (h) {
        return function () { h.parentElement.classList.toggle("open"); };
      }(heads[i]));
    }
  }

  // ==================== Start ====================
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
