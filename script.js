document.addEventListener("DOMContentLoaded", () => {
  // --- KONFIGURASI FIREBASE ---
  const firebaseConfig = {
    apiKey: "AIzaSyBA0AZrgr01JDU4dglrRY7UrRtniKRoyW0", // Ganti dengan Key Anda
    authDomain: "tabungan-nikah-kita.firebaseapp.com",
    projectId: "tabungan-nikah-kita",
    storageBucket: "tabungan-nikah-kita.firebasestorage.app",
    messagingSenderId: "505862394176",
    appId: "1:505862394176:web:eb3e0cea768f875f186aa5",
  };

  // --- STATE APLIKASI ---
  let appState = {
    settings: {
      targetSavings: 50000000,
      weddingDate: new Date(
        new Date().setFullYear(new Date().getFullYear() + 1)
      )
        .toISOString()
        .slice(0, 16),
      names: { person1: "Pria", person2: "Wanita" },
    },
    transactions: [],
    tasks: [],
    budgetItems: [],
    vendors: [],
    milestones: [],
  };
  let charts = {
    contribution: null,
    spending: null,
    savingsOverTime: null,
  };
  let countdownInterval = null;

  // --- INISIALISASI FIREBASE ---
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const collections = {
    settings: db.collection("settings").doc("config"), // Single document for settings
    transactions: db.collection("transactions"),
    tasks: db.collection("tasks"),
    budget: db.collection("budget"),
    vendors: db.collection("vendors"),
  };

  // --- FUNGSI UTAMA ---

  /**
   * Initializes the application, sets up listeners, and loads initial data.
   */
  function initApp() {
    setupEventListeners();
    loadTheme();
    initFirestoreListeners();
    init3DTiltEffect();
  }

  /**
   * Sets up listeners for all Firebase collections.
   */
  function initFirestoreListeners() {
    // Listener for Settings
    collections.settings.onSnapshot((doc) => {
      if (doc.exists) {
        appState.settings = doc.data();
      } else {
        // If settings don't exist in Firestore, create them with default values
        collections.settings.set(appState.settings);
      }
      // Re-initialize parts of the app that depend on settings
      startCountdown();
      generateMilestones();
      updateAllUI();
    });

    // Listener for Transactions
    collections.transactions
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        const oldBalance = calculateBalance(appState.transactions);
        appState.transactions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const newBalance = calculateBalance(appState.transactions);
        updateAllUI();
        checkMilestones(newBalance, oldBalance);
      });

    // Listener for Tasks
    collections.tasks.orderBy("createdAt", "asc").onSnapshot((snapshot) => {
      appState.tasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      updateAllUI();
    });

    // Listener for Budget
    collections.budget.orderBy("createdAt", "asc").onSnapshot((snapshot) => {
      appState.budgetItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      updateAllUI();
    });

    // Listener for Vendors
    collections.vendors.orderBy("createdAt", "asc").onSnapshot((snapshot) => {
      appState.vendors = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      renderVendorsPage();
    });
  }

  /**
   * Updates all UI components. Called whenever data changes.
   */
  function updateAllUI() {
    renderHomePage();
    renderTransactionPage();
    renderBudgetPage();
    renderChecklistPage();
    renderAnalysisPage();
    renderSettingsPage();
  }

  // --- FUNGSI RENDER HALAMAN & KOMPONEN ---

  function renderHomePage() {
    const balance = calculateBalance(appState.transactions);
    const progress = Math.min(
      (balance / appState.settings.targetSavings) * 100,
      100
    );

    // Render Progress
    document.getElementById("home-progress").innerHTML = `
      <div style="display: flex; justify-content: space-between; font-weight: 600;">
        <span>${formatToRupiah(balance)}</span>
        <span>dari ${formatToRupiah(appState.settings.targetSavings)}</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: ${progress}%;"></div>
      </div>
      <p style="text-align:center; font-weight:700; margin-top:10px;">${progress.toFixed(
        2
      )}% Tercapai</p>`;

    // Render Budget Summary
    const { totalAllocated, totalSpent } = calculateBudgetSummary();
    document.getElementById("home-budget-summary").innerHTML = `
        <h4>Ringkasan Anggaran</h4>
        <div class="overview-grid">
            <div><span>Dialokasikan</span><strong>${formatToRupiah(
              totalAllocated
            )}</strong></div>
            <div><span>Dibelanjakan</span><strong class="expense">${formatToRupiah(
              totalSpent
            )}</strong></div>
            <div><span>Sisa</span><strong>${formatToRupiah(
              totalAllocated - totalSpent
            )}</strong></div>
        </div>`;

    // Render Savings Rate Card
    const savingsRateCard = document.getElementById("savings-rate-card");
    const remainingAmount = Math.max(
      0,
      appState.settings.targetSavings - balance
    );
    const today = new Date();
    const weddingDay = new Date(appState.settings.weddingDate);
    const timeDiff = weddingDay.getTime() - today.getTime();
    const daysRemaining = Math.max(1, timeDiff / (1000 * 60 * 60 * 24)); // Avoid division by zero

    if (remainingAmount > 0 && timeDiff > 0) {
      const dailyRate = remainingAmount / daysRemaining;
      const weeklyRate = dailyRate * 7;
      const monthlyRate = dailyRate * 30.44; // More accurate average

      savingsRateCard.innerHTML = `
            <h4>Target Menabung Rutin</h4>
            <div class="savings-rate-grid">
                <div><span>Per Hari</span><strong>${formatToRupiah(
                  dailyRate
                )}</strong></div>
                <div><span>Per Minggu</span><strong>${formatToRupiah(
                  weeklyRate
                )}</strong></div>
                <div><span>Per Bulan</span><strong>${formatToRupiah(
                  monthlyRate
                )}</strong></div>
            </div>`;
    } else if (remainingAmount <= 0) {
      savingsRateCard.innerHTML = `<h4>🎉 Selamat!</h4><p style="text-align:center; margin-top:10px;">Target tabungan Anda sudah tercapai.</p>`;
    } else {
      savingsRateCard.innerHTML = `<h4>Waktu Habis</h4><p style="text-align:center; margin-top:10px;">Tanggal pernikahan telah berlalu.</p>`;
    }

    // Render Next Milestone
    const nextMilestone = appState.milestones.find((m) => balance < m.amount);
    document.getElementById("next-milestone-card").innerHTML = nextMilestone
      ? `🏆 Target Berikutnya: ${nextMilestone.name}`
      : "🎉 Semua target tercapai!";

    // Render Next Task
    const nextTask = appState.tasks.find((t) => !t.completed);
    const nextTaskCard = document.getElementById("next-task-card");
    if (nextTask) {
      nextTaskCard.style.display = "block";
      nextTaskCard.innerHTML = `<span>📌 Tugas Berikutnya:</span> <strong class="task-name">${nextTask.text}</strong>`;
    } else {
      nextTaskCard.style.display = "none";
    }
  }

  function renderTransactionPage() {
    const listEl = document.getElementById("transaction-list");
    listEl.innerHTML = "";
    if (appState.transactions.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>Belum Ada Transaksi</p><span>Mulai tabungan pertamamu dengan menekan tombol ➕.</span></div>`;
      return;
    }
    appState.transactions.forEach((t) => {
      const item = document.createElement("li");
      item.className = "list-item transaction-item";
      const icon = t.type === "income" ? "💰" : "💸";
      const category = appState.budgetItems.find((b) => b.id === t.category);
      item.innerHTML = `
        <div class="category-icon">${icon}</div>
        <div class="details">
          <span class="description">${t.description}</span>
          ${
            t.type === "expense" && category
              ? `<span class="category-badge">${category.categoryName}</span>`
              : ""
          }
          <span class="meta">${t.name} • ${formatDate(t.createdAt)}</span>
        </div>
        <div class="amount ${t.type}">${
        t.type === "income" ? "+" : "-"
      }${formatToRupiah(t.amount)}</div>
        <div class="transaction-actions">
          <button class="action-btn edit-btn" data-id="${
            t.id
          }" title="Edit">✏️</button>
          <button class="action-btn delete-btn" data-id="${
            t.id
          }" title="Hapus">🗑️</button>
        </div>`;
      listEl.appendChild(item);
    });
  }

  function renderBudgetPage() {
    const { totalAllocated, totalSpent } = calculateBudgetSummary();
    document.getElementById("budget-overview-card").innerHTML = `
          <div class="overview-grid">
              <div><span>Total Anggaran</span><strong>${formatToRupiah(
                totalAllocated
              )}</strong></div>
              <div><span>Total Terpakai</span><strong class="expense">${formatToRupiah(
                totalSpent
              )}</strong></div>
              <div><span>Sisa Anggaran</span><strong>${formatToRupiah(
                totalAllocated - totalSpent
              )}</strong></div>
          </div>`;

    const listEl = document.getElementById("budget-list");
    listEl.innerHTML = "";
    if (appState.budgetItems.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>Belum Ada Anggaran</p><span>Buat kategori anggaran pertamamu di atas.</span></div>`;
      return;
    }

    appState.budgetItems.forEach((item) => {
      const spentOnCategory = appState.transactions
        .filter((t) => t.type === "expense" && t.category === item.id)
        .reduce((acc, t) => acc + t.amount, 0);
      const progress =
        item.allocatedAmount > 0
          ? (spentOnCategory / item.allocatedAmount) * 100
          : 0;
      const remaining = item.allocatedAmount - spentOnCategory;

      const budgetLi = document.createElement("li");
      budgetLi.className = "list-item budget-item";
      budgetLi.innerHTML = `
              <div class="budget-item-header">
                  <span>${item.categoryName}</span>
                  <span>${formatToRupiah(item.allocatedAmount)}</span>
              </div>
              <div class="progress-bar-container">
                  <div class="progress-bar" style="width: ${progress}%; background-color: ${
        progress > 100 ? "var(--expense-color)" : "var(--accent-color)"
      };"></div>
              </div>
              <div class="budget-item-details">
                  <span>Terpakai: <span class="expense">${formatToRupiah(
                    spentOnCategory
                  )}</span></span>
                  <span>Sisa: ${formatToRupiah(remaining)}</span>
              </div>
              <div class="budget-item-actions">
                  <button class="action-btn edit-budget-btn" data-id="${
                    item.id
                  }" title="Edit">✏️</button>
                  <button class="action-btn delete-budget-btn" data-id="${
                    item.id
                  }" title="Hapus">🗑️</button>
              </div>
          `;
      listEl.appendChild(budgetLi);
    });
  }

  function renderChecklistPage() {
    const listEl = document.getElementById("task-list");
    listEl.innerHTML = "";
    if (appState.tasks.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>Belum Ada Tugas</p><span>Tambahkan checklist persiapan penting Anda di atas.</span></div>`;
      return;
    }
    appState.tasks.forEach((task) => {
      const item = document.createElement("li");
      item.className = "list-item task-item";
      item.innerHTML = `
        <label>
          <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${
        task.completed ? "checked" : ""
      }>
          <span class="${task.completed ? "completed" : ""}">${task.text}</span>
        </label>
        <button class="delete-task-btn" data-id="${task.id}">×</button>`;
      listEl.appendChild(item);
    });
  }

  function renderVendorsPage() {
    const listEl = document.getElementById("vendor-list");
    listEl.innerHTML = "";
    if (appState.vendors.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><p>Belum Ada Vendor</p><span>Tambahkan kontak vendor penting Anda di atas.</span></div>`;
      return;
    }
    appState.vendors.forEach((vendor) => {
      const vendorLi = document.createElement("li");
      vendorLi.className = "list-item vendor-item";
      vendorLi.innerHTML = `
              <div class="vendor-header">
                  <span class="vendor-icon">👥</span>
                  <div>
                      <div class="vendor-name">${vendor.vendorName}</div>
                      <div class="vendor-service">${vendor.service}</div>
                  </div>
              </div>
              <div class="vendor-contact">
                  ${
                    vendor.phone
                      ? `<span>📞 <a href="tel:${vendor.phone}">${vendor.phone}</a></span>`
                      : ""
                  }
                  ${
                    vendor.email
                      ? `<span>📧 <a href="mailto:${vendor.email}">${vendor.email}</a></span>`
                      : ""
                  }
              </div>
              ${
                vendor.notes
                  ? `<div class="vendor-notes">${vendor.notes.replace(
                      /\n/g,
                      "<br>"
                    )}</div>`
                  : ""
              }
              <div class="vendor-item-actions">
                  <button class="action-btn edit-vendor-btn" data-id="${
                    vendor.id
                  }" title="Edit">✏️</button>
                  <button class="action-btn delete-vendor-btn" data-id="${
                    vendor.id
                  }" title="Hapus">🗑️</button>
              </div>
          `;
      listEl.appendChild(vendorLi);
    });
  }

  function renderSettingsPage() {
    document.getElementById("setting-name1").value =
      appState.settings.names.person1;
    document.getElementById("setting-name2").value =
      appState.settings.names.person2;
    document.getElementById("setting-target").value =
      appState.settings.targetSavings;
    document.getElementById("setting-date").value =
      appState.settings.weddingDate;
  }

  function renderAnalysisPage() {
    const chartTextColor = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--text-color");
    const chartOptions = {
      responsive: true,
      plugins: {
        legend: { position: "top", labels: { color: chartTextColor } },
        title: { display: true, color: chartTextColor, font: { size: 16 } },
      },
    };

    // Chart 1: Contribution
    const contributionData = appState.transactions
      .filter((t) => t.type === "income")
      .reduce((acc, t) => {
        acc[t.name] = (acc[t.name] || 0) + t.amount;
        return acc;
      }, {});
    const contributionCtx = document
      .getElementById("contribution-chart")
      .getContext("2d");
    if (charts.contribution) charts.contribution.destroy();
    charts.contribution = new Chart(contributionCtx, {
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
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          title: {
            ...chartOptions.plugins.title,
            text: "Total Uang Ditabung per Orang",
          },
        },
      },
    });

    // Chart 2: Spending by Category
    const spendingData = appState.budgetItems.map((item) => {
      const spent = appState.transactions
        .filter((t) => t.type === "expense" && t.category === item.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return { category: item.categoryName, spent };
    });
    const spendingCtx = document
      .getElementById("spending-chart")
      .getContext("2d");
    if (charts.spending) charts.spending.destroy();
    charts.spending = new Chart(spendingCtx, {
      type: "bar",
      data: {
        labels: spendingData.map((d) => d.category),
        datasets: [
          {
            label: "Total Pengeluaran",
            data: spendingData.map((d) => d.spent),
            backgroundColor: "#ef5350",
          },
        ],
      },
      options: {
        ...chartOptions,
        plugins: {
          ...chartOptions.plugins,
          title: {
            ...chartOptions.plugins.title,
            text: "Pengeluaran per Kategori",
          },
        },
      },
    });

    // Chart 3: Savings Growth Over Time
    const savingsHistory = [];
    let currentBalance = 0;
    [...appState.transactions].reverse().forEach((t) => {
      // oldest first
      currentBalance += t.type === "income" ? t.amount : -t.amount;
      savingsHistory.push({ x: t.createdAt.toDate(), y: currentBalance });
    });
    const savingsCtx = document
      .getElementById("savings-over-time-chart")
      .getContext("2d");
    if (charts.savingsOverTime) charts.savingsOverTime.destroy();
    charts.savingsOverTime = new Chart(savingsCtx, {
      type: "line",
      data: {
        datasets: [
          {
            label: "Pertumbuhan Tabungan",
            data: savingsHistory,
            borderColor: "var(--accent-color)",
            tension: 0.1,
          },
        ],
      },
      options: {
        ...chartOptions,
        scales: {
          x: {
            type: "time",
            time: { unit: "month" },
            ticks: { color: chartTextColor },
          },
          y: { ticks: { color: chartTextColor } },
        },
        plugins: {
          ...chartOptions.plugins,
          title: {
            ...chartOptions.plugins.title,
            text: "Pertumbuhan Tabungan",
          },
        },
      },
    });
  }

  // --- FUNGSI KALKULASI & LOGIKA ---
  const calculateBalance = (transactions) =>
    transactions.reduce(
      (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
      0
    );
  const calculateBudgetSummary = () => {
    const totalAllocated = appState.budgetItems.reduce(
      (acc, item) => acc + item.allocatedAmount,
      0
    );
    const totalSpent = appState.transactions
      .filter((t) => t.type === "expense")
      .reduce((acc, t) => acc + t.amount, 0);
    return { totalAllocated, totalSpent };
  };

  function generateMilestones() {
    const target = appState.settings.targetSavings;
    appState.milestones = [
      { amount: target * 0.1, name: "10% Pertama!" },
      { amount: target * 0.25, name: " seperempat Jalan! 25%!" },
      { amount: target * 0.5, name: "Setengah Jalan! 50% Tercapai!" },
      { amount: target * 0.75, name: "Hampir Sampai! 75%!" },
      { amount: target * 0.9, name: "Sedikit Lagi! 90%!" },
      { amount: target, name: "TARGET TERCAPAI! Selamat! 💍" },
    ];
  }

  function checkMilestones(newBalance, oldBalance) {
    if (newBalance <= oldBalance) return;
    appState.milestones.forEach((milestone) => {
      if (newBalance >= milestone.amount && oldBalance < milestone.amount) {
        showToast(`🎉 MILESTONE: ${milestone.name}`, "success");
        triggerConfetti();
        triggerHaptic(200);
      }
    });
  }

  // --- FUNGSI-FUNGSI UI (Modals, Toasts, Countdown, etc) ---

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    const targetTime = new Date(appState.settings.weddingDate).getTime();
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
        <h4>Waktu Menuju Hari H</h4>
        <div class="time-grid">
            <div class="time-block"><span class="time-value">${days}</span><span class="time-label">Hari</span></div>
            <div class="time-block"><span class="time-value">${hours}</span><span class="time-label">Jam</span></div>
            <div class="time-block"><span class="time-value">${minutes}</span><span class="time-label">Menit</span></div>
            <div class="time-block"><span class="time-value">${seconds}</span><span class="time-label">Detik</span></div>
        </div>`;
    }, 1000);
  }

  function openModal(modalId, data = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("active");

    if (modalId === "transaction-modal") {
      const form = document.getElementById("transaction-form");
      form.reset();
      document.getElementById("transaction-modal-title").textContent = data
        ? "Edit Transaksi"
        : "Tambah Transaksi";
      const nameSelect = document.getElementById("transaction-name");
      nameSelect.innerHTML = `<option value="${appState.settings.names.person1}">${appState.settings.names.person1}</option><option value="${appState.settings.names.person2}">${appState.settings.names.person2}</option>`;

      // Populate budget categories
      const categorySelect = document.getElementById("transaction-category");
      categorySelect.innerHTML =
        '<option value="">-- Tanpa Kategori --</option>';
      appState.budgetItems.forEach((item) => {
        categorySelect.innerHTML += `<option value="${item.id}">${item.categoryName}</option>`;
      });

      if (data) {
        document.getElementById("transaction-id").value = data.id;
        nameSelect.value = data.name;
        document.getElementById("description").value = data.description;
        document.getElementById("amount").value = data.amount;
        document.getElementById("type").value = data.type;
        document.getElementById("note").value = data.note || "";
        categorySelect.value = data.category || "";
      } else {
        document.getElementById("transaction-id").value = "";
      }
      toggleTransactionFormFields();
    } else if (modalId === "budget-modal") {
      document.getElementById("budget-form").reset();
      document.getElementById("budget-modal-title").textContent = data
        ? "Edit Kategori"
        : "Tambah Kategori";
      if (data) {
        document.getElementById("budget-id").value = data.id;
        document.getElementById("budget-category-name").value =
          data.categoryName;
        document.getElementById("budget-amount").value = data.allocatedAmount;
      } else {
        document.getElementById("budget-id").value = "";
      }
    } else if (modalId === "vendor-modal") {
      document.getElementById("vendor-form").reset();
      document.getElementById("vendor-modal-title").textContent = data
        ? "Edit Vendor"
        : "Tambah Vendor";
      if (data) {
        document.getElementById("vendor-id").value = data.id;
        document.getElementById("vendor-name").value = data.vendorName;
        document.getElementById("vendor-service").value = data.service;
        document.getElementById("vendor-phone").value = data.phone || "";
        document.getElementById("vendor-email").value = data.email || "";
        document.getElementById("vendor-notes").value = data.notes || "";
      } else {
        document.getElementById("vendor-id").value = "";
      }
    }
  }

  function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove("active");
  }

  function toggleTransactionFormFields() {
    const type = document.getElementById("type").value;
    document.getElementById("category-wrapper").style.display =
      type === "expense" ? "block" : "none";
    document.getElementById("note-wrapper").style.display =
      type === "income" ? "block" : "none";
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Main Navigation
    document.querySelector(".bottom-nav").addEventListener("click", (e) => {
      const navBtn = e.target.closest(".nav-btn");
      if (navBtn && !navBtn.disabled) {
        triggerHaptic();
        switchPage(navBtn.dataset.page);
      }
    });

    // Sub-page navigation, links, and copy buttons
    document.body.addEventListener("click", (e) => {
      const backBtn = e.target.closest(".sub-page-header");
      if (backBtn && backBtn.dataset.back) {
        switchPage(backBtn.dataset.back);
      }
      const moreLink = e.target.closest(".more-links-list li");
      if (moreLink && moreLink.dataset.page) {
        switchPage(moreLink.dataset.page);
      }

      const copyBtn = e.target.closest(".copy-btn");
      if (copyBtn) {
        const li = copyBtn.closest("li");
        const accountNumberEl = li.querySelector(".account-number");
        if (accountNumberEl) {
          const accountNumber = accountNumberEl.textContent;
          navigator.clipboard
            .writeText(accountNumber)
            .then(() => {
              showToast("Nomor rekening disalin!", "success");
              triggerHaptic();
            })
            .catch((err) => {
              showToast("Gagal menyalin.", "error");
            });
        }
      }
    });

    // Add Buttons
    document
      .getElementById("add-transaction-btn")
      .addEventListener("click", () => openModal("transaction-modal"));
    document
      .getElementById("add-budget-btn")
      .addEventListener("click", () => openModal("budget-modal"));
    document
      .getElementById("add-vendor-btn")
      .addEventListener("click", () => openModal("vendor-modal"));

    // Modal Close Buttons
    document.querySelectorAll(".close-modal-btn").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.modal));
    });
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(modal.id);
      });
    });

    // Form Submissions
    document
      .getElementById("transaction-form")
      .addEventListener("submit", handleTransactionSubmit);
    document
      .getElementById("task-form")
      .addEventListener("submit", handleTaskSubmit);
    document
      .getElementById("budget-form")
      .addEventListener("submit", handleBudgetSubmit);
    document
      .getElementById("vendor-form")
      .addEventListener("submit", handleVendorSubmit);
    document
      .getElementById("settings-form")
      .addEventListener("submit", handleSettingsSubmit);

    // List Item Actions (Edit/Delete)
    document
      .getElementById("transaction-list")
      .addEventListener("click", handleListActions);
    document
      .getElementById("budget-list")
      .addEventListener("click", handleListActions);
    document
      .getElementById("vendor-list")
      .addEventListener("click", handleListActions);
    document
      .getElementById("task-list")
      .addEventListener("click", handleTaskListClick);

    // Other UI controls
    document
      .getElementById("theme-toggle")
      .addEventListener("change", toggleTheme);
    document
      .getElementById("notifications-btn")
      .addEventListener("click", requestNotificationPermission);
    document
      .getElementById("type")
      .addEventListener("change", toggleTransactionFormFields);
  }

  // --- EVENT HANDLERS ---
  function handleTransactionSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("transaction-id").value;
    const type = document.getElementById("type").value;
    const transactionData = {
      name: document.getElementById("transaction-name").value,
      description: document.getElementById("description").value,
      amount: parseFloat(document.getElementById("amount").value),
      type: type,
      note: type === "income" ? document.getElementById("note").value : null,
      category:
        type === "expense"
          ? document.getElementById("transaction-category").value
          : null,
    };

    const promise = id
      ? collections.transactions.doc(id).update(transactionData)
      : collections.transactions.add({
          ...transactionData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

    promise
      .then(() => {
        showToast(
          id ? "Berhasil diperbarui!" : "Berhasil disimpan!",
          "success"
        );
        closeModal("transaction-modal");
      })
      .catch((err) => showToast(`Error: ${err.message}`, "error"));
  }

  function handleTaskSubmit(e) {
    e.preventDefault();
    const taskInput = document.getElementById("task-input");
    if (taskInput.value.trim() === "") return;
    collections.tasks
      .add({
        text: taskInput.value.trim(),
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .then(() => {
        taskInput.value = "";
        showToast("Tugas ditambahkan!", "success");
      })
      .catch((err) => showToast(`Error: ${err.message}`, "error"));
  }

  function handleBudgetSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("budget-id").value;
    const budgetData = {
      categoryName: document.getElementById("budget-category-name").value,
      allocatedAmount: parseFloat(
        document.getElementById("budget-amount").value
      ),
    };
    const promise = id
      ? collections.budget.doc(id).update(budgetData)
      : collections.budget.add({
          ...budgetData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

    promise
      .then(() => {
        showToast(
          id ? "Kategori diperbarui!" : "Kategori disimpan!",
          "success"
        );
        closeModal("budget-modal");
      })
      .catch((err) => showToast(`Error: ${err.message}`, "error"));
  }

  function handleVendorSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("vendor-id").value;
    const vendorData = {
      vendorName: document.getElementById("vendor-name").value,
      service: document.getElementById("vendor-service").value,
      phone: document.getElementById("vendor-phone").value,
      email: document.getElementById("vendor-email").value,
      notes: document.getElementById("vendor-notes").value,
    };
    const promise = id
      ? collections.vendors.doc(id).update(vendorData)
      : collections.vendors.add({
          ...vendorData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

    promise
      .then(() => {
        showToast(id ? "Vendor diperbarui!" : "Vendor disimpan!", "success");
        closeModal("vendor-modal");
      })
      .catch((err) => showToast(`Error: ${err.message}`, "error"));
  }

  function handleSettingsSubmit(e) {
    e.preventDefault();
    const settingsData = {
      names: {
        person1: document.getElementById("setting-name1").value,
        person2: document.getElementById("setting-name2").value,
      },
      targetSavings: parseFloat(
        document.getElementById("setting-target").value
      ),
      weddingDate: document.getElementById("setting-date").value,
    };
    collections.settings
      .set(settingsData, { merge: true })
      .then(() => showToast("Pengaturan berhasil disimpan!", "success"))
      .catch((err) => showToast(`Error: ${err.message}`, "error"));
  }

  function handleListActions(e) {
    const btn = e.target.closest(".action-btn");
    if (!btn) return;

    // prevent this from firing if it's a copy button
    if (btn.classList.contains("copy-btn")) return;

    triggerHaptic();
    const id = btn.dataset.id;
    const list = btn.closest("ul").id;

    if (list === "transaction-list") {
      if (btn.classList.contains("edit-btn")) {
        const tx = appState.transactions.find((t) => t.id === id);
        if (tx) openModal("transaction-modal", tx);
      }
      if (btn.classList.contains("delete-btn")) {
        if (confirm("Yakin ingin menghapus transaksi ini?")) {
          collections.transactions.doc(id).delete();
        }
      }
    } else if (list === "budget-list") {
      if (btn.classList.contains("edit-budget-btn")) {
        const item = appState.budgetItems.find((i) => i.id === id);
        if (item) openModal("budget-modal", item);
      }
      if (btn.classList.contains("delete-budget-btn")) {
        if (
          confirm(
            "Yakin ingin menghapus kategori ini? Semua transaksi terkait tidak akan terhapus, namun kategorinya akan dihilangkan."
          )
        ) {
          collections.budget.doc(id).delete();
        }
      }
    } else if (list === "vendor-list") {
      if (btn.classList.contains("edit-vendor-btn")) {
        const item = appState.vendors.find((i) => i.id === id);
        if (item) openModal("vendor-modal", item);
      }
      if (btn.classList.contains("delete-vendor-btn")) {
        if (confirm("Yakin ingin menghapus vendor ini?")) {
          collections.vendors.doc(id).delete();
        }
      }
    }
  }

  function handleTaskListClick(e) {
    const target = e.target;
    const id = target.dataset.id;
    if (target.classList.contains("task-checkbox")) {
      collections.tasks.doc(id).update({ completed: target.checked });
    }
    if (target.classList.contains("delete-task-btn")) {
      if (confirm("Yakin ingin menghapus tugas ini?")) {
        collections.tasks.doc(id).delete();
      }
    }
  }

  // --- FUNGSI UTILITAS & EFEK ---
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
      ?.classList.add("active");

    // Re-render analysis charts when switching to analysis page to ensure they are drawn correctly
    if (pageId === "analysis") {
      setTimeout(() => renderAnalysisPage(), 50);
    }
  }

  function init3DTiltEffect() {
    const cards = document.querySelectorAll(".tilt-card");
    if (window.matchMedia("(pointer: fine)").matches) {
      cards.forEach((card) => {
        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          card.style.transform = `perspective(1000px) rotateX(${
            -y / 30
          }deg) rotateY(${x / 30}deg) scale3d(1.05, 1.05, 1.05)`;
        });
        card.addEventListener("mouseleave", () => {
          card.style.transform =
            "perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
        });
      });
    }
  }

  function toggleTheme() {
    const theme = document.getElementById("theme-toggle").checked
      ? "dark"
      : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    // Re-render charts with new theme colors after a short delay for the theme transition to complete
    setTimeout(() => updateAllUI(), 300);
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.getElementById("theme-toggle").checked = savedTheme === "dark";
  }

  function triggerConfetti() {
    if (typeof confetti === "function")
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
  }

  function triggerHaptic(duration = 50) {
    if (navigator.vibrate) navigator.vibrate(duration);
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

  function requestNotificationPermission() {
    // Logic from original file, remains unchanged
    showToast("Fitur notifikasi sedang dalam pengembangan.", "");
  }

  // --- Mulai Aplikasi ---
  initApp();
});
