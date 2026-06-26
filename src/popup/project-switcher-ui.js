/* ===== src/popup/project-switcher-ui.js ===== */
// 项目切换器 UI：顶部 pill 导航

(function() {
  const ns = globalThis.InternalDevToolkit;

  async function init() {
    const currentId = await ns.currentProject.getCurrentProjectId();
    const pillsContainer = document.getElementById('projectPills');
    if (!pillsContainer) {
      console.warn('[项目切换器] #projectPills 容器不存在');
      return;
    }

    const pills = ns.projects.PROJECTS.map(p => {
      const isActive = p.id === currentId;
      return `<div class="project-pill ${isActive ? 'active' : ''}" data-project-id="${p.id}">${p.name}</div>`;
    }).join('');

    pillsContainer.innerHTML = pills;

    // 点击切换项目
    pillsContainer.addEventListener('click', async (e) => {
      const pill = e.target.closest('.project-pill');
      if (!pill || pill.classList.contains('active')) return;

      const newId = pill.dataset.projectId;
      await ns.currentProject.setCurrentProjectId(newId);
      await ns.currentProject.loadCurrentProject();

      // 刷新 popup（简单粗暴但有效）
      location.reload();
    });
  }

  ns.projectSwitcherUi = { init };
})();
