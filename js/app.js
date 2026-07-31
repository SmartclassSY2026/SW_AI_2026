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
      "toast","hljsLight","hljsDark",
    ];
    for (var i = 0; i < ids.length; i++) el[ids[i]] = $(ids[i]);
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

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!el.settingsModal.classList.contains("hidden")) closeSettingsModal();
        if (!el.teacherPwdModal.classList.contains("hidden")) el.teacherPwdModal.classList.add("hidden");
        if (!el.exampleModal.classList.contains("hidden")) el.exampleModal.classList.add("hidden");
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

  // ==================== Start ====================
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
