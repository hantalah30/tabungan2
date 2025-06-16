document.addEventListener("DOMContentLoaded", () => {
  // --- KONFIGURASI & STATE APLIKASI ---
  const TARGET_SAVINGS = 50000000; // Ganti dengan target Anda
  const WEDDING_DATE = "2026-06-16T09:00:00"; // Ganti dengan Tanggal & Waktu Pernikahan Anda (YYYY-MM-DDTHH:MM:SS)
  const MILESTONES = [
    { amount: 1000000, name: "Langkah Awal: Rp 1 Juta!", achieved: false },
    { amount: 5000000, name: "Wow, Rp 5 Juta Terkumpul!", achieved: false },
    {
      amount: TARGET_SAVINGS * 0.5,
      name: "Setengah Jalan! 50% Tercapai!",
      achieved: false,
    },
    {
      amount: TARGET_SAVINGS * 0.75,
      name: "Hampir Sampai! 75%!",
      achieved: false,
    },
    {
      amount: TARGET_SAVINGS,
      name: "TARGET TERCAPAI! Selamat! 💍",
      achieved: false,
    },
  ];
  const firebaseConfig = {
    apiKey: "AIzaSyBA0AZrgr01JDU4dglrRY7UrRtniKRoyW0",
    authDomain: "tabungan-nikah-kita.firebaseapp.com",
    projectId: "tabungan-nikah-kita",
    storageBucket: "tabungan-nikah-kita.firebasestorage.app",
    messagingSenderId: "505862394176",
    appId: "1:505862394176:web:eb3e0cea768f875f186aa5",
    measurementId: "G-Z2T5R4TR9F",
  };

  let allTransactions = [];
  let allTasks = [];
  let contributionChart = null;
  let countdownInterval = null;

  // --- INISIALISASI ---
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const messaging = firebase.messaging.isSupported()
    ? firebase.messaging()
    : null;
  const transactionsCollection = db.collection("transactions");
  const tasksCollection = db.collection("tasks");

  initApp();

  function initApp() {
    setupEventListeners();
    loadTheme();
    loadSavedName();
    // Listener untuk Transaksi
    transactionsCollection
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        const oldBalance = calculateBalance(allTransactions);
        allTransactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const newBalance = calculateBalance(allTransactions);
        updateAllUI();
        checkMilestones(newBalance, oldBalance);
      });
    // Listener untuk Checklist
    tasksCollection.orderBy("createdAt", "asc").onSnapshot((snapshot) => {
      allTasks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      renderChecklistPage();
    });
    // Mulai Countdown
    startCountdown();
    // Mengaktifkan efek 3D pada kartu
    init3DTiltEffect();
  }

  // --- FUNGSI KALKULASI ---
  const calculateBalance = (transactions) =>
    transactions.reduce(
      (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
      0
    );

  // --- FUNGSI-FUNGSI RENDER ---
  function updateAllUI() {
    renderHomePage();
    renderTransactionPage();
    renderJournalPage();
    renderAnalysisPage();
    renderChecklistPage();
  }

  function renderHomePage() {
    const balance = calculateBalance(allTransactions);
    const income = allTransactions
      .filter((t) => t.type === "income")
      .reduce((acc, t) => acc + t.amount, 0);
    const expense = allTransactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);
    const progress = Math.min((balance / TARGET_SAVINGS) * 100, 100);

    document.getElementById(
      "home-progress"
    ).innerHTML = `<div style="display: flex; justify-content: space-between; font-weight: 600;"><span>${formatToRupiah(
      balance
    )}</span><span>dari ${formatToRupiah(
      TARGET_SAVINGS
    )}</span></div><div class="progress-bar-container" style="margin-top: 10px;"><div class="progress-bar" style="width: ${progress}%; background: linear-gradient(90deg, var(--accent-color-light), var(--accent-color));"></div></div><p style="text-align:center; font-weight:700; margin-top:10px;">${progress.toFixed(
      2
    )}% Tercapai</p>`;
    document.getElementById(
      "home-summary"
    ).innerHTML = `<h4>Ringkasan Cepat</h4><div style="display:flex; justify-content: space-around; text-align:center; margin-top: 15px;"><div><span style="font-size:0.9em; color:var(--text-color-secondary);">Total Nabung</span><br><strong class="income">${formatToRupiah(
      income
    )}</strong></div><div><span style="font-size:0.9em; color:var(--text-color-secondary);">Total Ditarik</span><br><strong class="expense">${formatToRupiah(
      expense
    )}</strong></div></div>`;

    const nextMilestone = MILESTONES.find((m) => balance < m.amount);
    document.getElementById("next-milestone-card").innerHTML = nextMilestone
      ? `🏆 Target Berikutnya: ${nextMilestone.name}`
      : "🎉 Semua target tercapai!";
  }

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    const targetTime = new Date(WEDDING_DATE).getTime();
    const countdownEl = document.getElementById("countdown-card");

    countdownInterval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetTime - now;

      if (distance < 0) {
        clearInterval(countdownInterval);
        countdownEl.innerHTML = "<h2>Selamat Menempuh Hidup Baru! ❤️</h2>";
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      countdownEl.innerHTML = `
              <h4>Waktu Target</h4>
              <div class="time-grid">
                  <div class="time-block"><span class="time-value">${days}</span><span class="time-label">Hari</span></div>
                  <div class="time-block"><span class="time-value">${hours}</span><span class="time-label">Jam</span></div>
                  <div class="time-block"><span class="time-value">${minutes}</span><span class="time-label">Menit</span></div>
                  <div class="time-block"><span class="time-value">${seconds}</span><span class="time-label">Detik</span></div>
              </div>`;
    }, 1000);
  }

  function renderTransactionPage() {
    const listEl = document.getElementById("transaction-list");
    listEl.innerHTML = "";
    if (allTransactions.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M1.5 1a.5.5 0 0 0-.5.5v3a.5.5 0 0 1-1 0v-3A1.5 1.5 0 0 1 1.5 0h13A1.5 1.5 0 0 1 16 1.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 0-.5-.5zM1 4.5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5m14 0a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0v-3a.5.5 0 0 1 .5-.5m-13 4A1.5 1.5 0 0 1 1.5 10h13a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-3A1.5 1.5 0 0 1 1.5 10M1 11.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"/></svg>
          <p>Belum Ada Transaksi</p>
          <span>Mulai tabungan pertamamu dengan menekan tombol ➕ di bawah.</span>
        </div>`;
      return;
    }
    allTransactions.forEach((t) => {
      const item = document.createElement("li");
      item.className = "transaction-item";
      const icon = t.type === "income" ? "💰" : "💸";
      item.innerHTML = `
              <div class="category-icon">${icon}</div>
              <div class="details">
                  <span class="description">${t.description}</span>
                  <span class="meta">${t.name} • ${formatDate(
        t.createdAt
      )}</span>
              </div>
              <div class="amount ${t.type}">${
        t.type === "income" ? "+" : "-"
      }${formatToRupiah(t.amount)}</div>
              <div class="transaction-actions">
                  <button class="action-btn edit-btn" data-id="${
                    t.id
                  }">✏️</button>
                  <button class="action-btn delete-btn" data-id="${
                    t.id
                  }">🗑️</button>
              </div>`;
      listEl.appendChild(item);
    });
  }

  function renderJournalPage() {
    const timelineEl = document.getElementById("journal-timeline");
    timelineEl.innerHTML = "";
    const journalEntries = allTransactions.filter(
      (t) => t.type === "income" && t.note
    );
    if (journalEntries.length === 0) {
      timelineEl.innerHTML =
        '<div class="empty-state"><p>Belum ada catatan kenangan.</p><span>Coba tulis satu saat menabung nanti!</span></div>';
      return;
    }
    journalEntries.forEach((t) => {
      const entry = document.createElement("div");
      entry.className = "journal-entry";
      entry.innerHTML = `
              <div class="meta">
                  <span class="description">${t.description}</span>
                  <span>${formatToRupiah(t.amount)} oleh <strong>${
        t.name
      }</strong></span>
                  <span class="date">• ${formatDate(t.createdAt)}</span>
              </div>
              <div class="note">"${t.note}"</div>`;
      timelineEl.appendChild(entry);
    });
  }

  function renderChecklistPage() {
    const listEl = document.getElementById("task-list");
    listEl.innerHTML = "";
    if (allTasks.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16"><path d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5m-8.5 4a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1m5 0a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1m5 0a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1"/></svg>
          <p>Belum Ada Tugas</p>
          <span>Mulai tambahkan checklist persiapan penting Anda di atas.</span>
        </div>`;
      return;
    }
    allTasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = "task-item";
      item.innerHTML = `
              <label>
                  <input type="checkbox" class="task-checkbox" data-id="${
                    task.id
                  }" ${task.completed ? "checked" : ""}>
                  <span class="${task.completed ? "completed" : ""}">${
        task.text
      }</span>
              </label>
              <button class="delete-task-btn" data-id="${task.id}">×</button>`;
      listEl.appendChild(item);
    });
  }

  function renderAnalysisPage() {
    const contributionData = allTransactions
      .filter((t) => t.type === "income")
      .reduce((acc, t) => {
        acc[t.name] = (acc[t.name] || 0) + t.amount;
        return acc;
      }, {});
    const ctx = document.getElementById("contribution-chart").getContext("2d");
    if (contributionChart) contributionChart.destroy();

    const chartTextColor = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--text-color");

    contributionChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(contributionData),
        datasets: [
          {
            label: "Total Kontribusi",
            data: Object.values(contributionData),
            backgroundColor: ["#f06292", "#64b5f6", "#81c784", "#ffd54f"],
            borderColor: "rgba(255,255,255,0.2)",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top", labels: { color: chartTextColor } },
          title: {
            display: true,
            text: "Total Uang yang Ditabung per Orang",
            color: chartTextColor,
            font: { size: 16 },
          },
        },
      },
    });
  }

  // --- FUNGSI MILESTONE & EFEK ---
  function checkMilestones(newBalance, oldBalance) {
    if (newBalance <= oldBalance) return;
    MILESTONES.forEach((milestone) => {
      if (newBalance >= milestone.amount && oldBalance < milestone.amount) {
        showToast(`🎉 MILESTONE: ${milestone.name}`, "success");
        triggerConfetti();
        triggerHaptic(200);
      }
    });
  }

  function triggerConfetti() {
    if (typeof confetti === "function") {
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }
  }

  function triggerHaptic(duration = 50) {
    if (navigator.vibrate) {
      navigator.vibrate(duration);
    }
  }

  // --- EVENT LISTENERS & LOGIKA UTAMA ---
  function setupEventListeners() {
    document.querySelector(".bottom-nav").addEventListener("click", (e) => {
      const navBtn = e.target.closest(".nav-btn");
      if (navBtn && !navBtn.disabled) {
        triggerHaptic();
        switchPage(navBtn.dataset.page);
      }
    });
    document
      .getElementById("add-transaction-btn")
      .addEventListener("click", () => {
        triggerHaptic(100);
        openModal();
      });
    document
      .getElementById("close-modal-btn")
      .addEventListener("click", closeModal);
    document.getElementById("form-modal").addEventListener("click", (e) => {
      if (e.target.id === "form-modal") closeModal();
    });
    document
      .getElementById("transaction-form")
      .addEventListener("submit", handleFormSubmit);
    document
      .getElementById("task-form")
      .addEventListener("submit", handleTaskSubmit);
    document
      .getElementById("task-list")
      .addEventListener("click", handleTaskListClick);
    document
      .getElementById("transaction-list")
      .addEventListener("click", (e) => {
        const btn = e.target.closest(".action-btn");
        if (!btn) return;
        triggerHaptic();
        const id = btn.dataset.id;
        if (btn.classList.contains("edit-btn")) {
          const tx = allTransactions.find((t) => t.id === id);
          if (tx) openModal(tx);
        }
        if (btn.classList.contains("delete-btn")) {
          deleteTransaction(id);
        }
      });
    document.getElementById("theme-toggle").addEventListener("change", (e) => {
      toggleTheme(e);
      // Re-render chart with new theme colors
      setTimeout(() => renderAnalysisPage(), 300);
    });
    document
      .getElementById("notifications-btn")
      .addEventListener("click", requestNotificationPermission);

    document.getElementById("page-home").addEventListener("click", (e) => {
      const copyBtn = e.target.closest(".copy-btn");
      if (copyBtn) {
        const rekeningNumber = copyBtn.dataset.rekening;
        navigator.clipboard
          .writeText(rekeningNumber)
          .then(() => {
            showToast("Nomor rekening disalin!", "success");
            triggerHaptic();
          })
          .catch((err) => {
            showToast("Gagal menyalin.", "error");
            console.error("Failed to copy: ", err);
          });
      }
    });
  }

  function handleTaskSubmit(e) {
    e.preventDefault();
    const taskInput = document.getElementById("task-input");
    const taskText = taskInput.value.trim();
    if (taskText === "") return;
    tasksCollection
      .add({
        text: taskText,
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        taskInput.value = "";
        showToast("Tugas ditambahkan!", "success");
      })
      .catch((err) => showToast(`Error: ${err.message}`, "error"));
  }

  function handleTaskListClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (target.classList.contains("task-checkbox")) {
      tasksCollection.doc(id).update({ completed: target.checked });
    }
    if (target.classList.contains("delete-task-btn")) {
      if (confirm("Yakin ingin menghapus tugas ini?")) {
        tasksCollection.doc(id).delete();
      }
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    triggerHaptic();
    const form = e.target;
    const id = document.getElementById("transaction-id").value;
    const type = document.getElementById("type").value;
    const transactionData = {
      name: document.getElementById("name").value,
      description: document.getElementById("description").value,
      amount: parseFloat(document.getElementById("amount").value),
      type: type,
      note: type === "income" ? document.getElementById("note").value : null,
    };

    const promise = id
      ? transactionsCollection.doc(id).update(transactionData)
      : transactionsCollection.add({
          ...transactionData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

    promise
      .then(() => {
        showToast(
          id ? "Berhasil diperbarui!" : "Berhasil disimpan!",
          "success"
        );
        closeModal();
        form.reset();
      })
      .catch((err) => showToast(`Error: ${err.message}`, "error"));
  }

  function openModal(transaction = null) {
    const form = document.getElementById("transaction-form");
    form.reset();
    document.getElementById("modal-title").textContent = transaction
      ? "Edit Transaksi"
      : "Tambah Transaksi";
    const noteTextarea = document.getElementById("note");

    if (transaction) {
      document.getElementById("transaction-id").value = transaction.id;
      document.getElementById("name").value = transaction.name;
      document.getElementById("description").value = transaction.description;
      document.getElementById("amount").value = transaction.amount;
      document.getElementById("type").value = transaction.type;
      noteTextarea.value = transaction.note || "";
    } else {
      document.getElementById("transaction-id").value = "";
      document.getElementById("name").value =
        localStorage.getItem("savedName") || "";
    }

    noteTextarea.style.display =
      document.getElementById("type").value === "income" ? "block" : "none";
    document.getElementById("type").onchange = (e) => {
      noteTextarea.style.display =
        e.target.value === "income" ? "block" : "none";
    };

    document.getElementById("form-modal").classList.add("active");
  }

  function closeModal() {
    document.getElementById("form-modal").classList.remove("active");
  }

  function deleteTransaction(id) {
    if (confirm("Yakin ingin menghapus transaksi ini?")) {
      transactionsCollection
        .doc(id)
        .delete()
        .then(() => showToast("Transaksi dihapus.", "success"))
        .catch((err) => showToast(`Error: ${err.message}`, "error"));
    }
  }

  // --- Fungsi untuk Efek 3D Interaktif (Tilt) ---
  function init3DTiltEffect() {
    const cards = document.querySelectorAll(".tilt-card");

    if (window.matchMedia("(pointer: fine)").matches) {
      cards.forEach((card) => {
        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          const rotateX = -y / 30;
          const rotateY = x / 30;
          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        });
        card.addEventListener("mouseleave", () => {
          card.style.transform =
            "perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
        });
      });
    }
  }

  // --- FUNGSI UTILITAS ---
  function switchPage(pageId) {
    if (!pageId) return;
    document
      .querySelectorAll(".page")
      .forEach((p) => p.classList.remove("active"));
    document.getElementById(`page-${pageId}`).classList.add("active");
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector(`.nav-btn[data-page="${pageId}"]`)
      .classList.add("active");
  }

  function toggleTheme(e) {
    const theme = e.target.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.getElementById("theme-toggle").checked = savedTheme === "dark";
  }

  function loadSavedName() {
    document.getElementById("name").value =
      localStorage.getItem("savedName") || "";
    document.getElementById("name").addEventListener("input", (e) => {
      localStorage.setItem("savedName", e.target.value);
    });
  }

  function requestNotificationPermission() {
    if (!messaging)
      return showToast("Notifikasi tidak didukung di browser ini.", "error");
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        showToast("Notifikasi diizinkan!", "success");
        // GANTI DENGAN VAPID KEY ANDA DARI SETTINGS FIREBASE
        messaging
          .getToken({ vapidKey: "BG..." })
          .then((currentToken) => {
            if (currentToken) {
              console.log("FCM Token:", currentToken);
              db.collection("fcm_tokens").doc(currentToken).set({
                token: currentToken,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              showToast("Gagal mendapatkan token notifikasi.", "error");
            }
          })
          .catch((err) =>
            console.error("An error occurred while retrieving token. ", err)
          );
      } else {
        showToast("Anda tidak mengizinkan notifikasi.", "error");
      }
    });
  }

  const formatToRupiah = (number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(number);
  const formatDate = (timestamp) =>
    timestamp
      ? new Date(timestamp.seconds * 1000).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
  const showToast = (message, type = "") => {
    const tc = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = message;
    tc.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => {
      t.classList.remove("show");
      t.addEventListener("transitionend", () => t.remove());
    }, 3000);
  };
});
