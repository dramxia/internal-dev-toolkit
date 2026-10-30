/* 将实际公共组件与用户选定的「细线列表」静态快照逐项比对。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const referenceHtml = fs.readFileSync(path.join(__dirname, 'fixtures/user-card-flat-reference.html'), 'utf8');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const popupCss = popupHtml.match(/<style>([\s\S]*?)<\/style>/)[1];
const selectors = {
  card: ['', ''], header: ['.cp-head', '.quick-user-header'],
  identity: ['.cp-identity', '.quick-user-identity'], avatar: ['.cp-avatar', '.quick-user-avatar'],
  name: ['.cp-name', '.quick-user-name'], role: ['.cp-role', '.list-item-role'],
  account: ['.cp-account', '.list-item-meta'], phoneRow: ['.cp-phone-row', '.quick-user-phone-row'],
  phone: ['.cp-phone-number', '.quick-user-phone'], phoneCopy: ['.cp-phone-copy', '.quick-user-phone-copy'],
  phoneIcon: ['.cp-phone-copy svg', '.quick-user-phone-copy svg'],
  environment: ['.cp-env', '.quick-user-env-select'], environmentArrow: ['.cp-env-chevron', '.quick-user-env-chevron'],
  toolbar: ['.cp-toolbar', '.quick-user-toolbar'], open: ['.cp-quick[data-action="open"]', '.quick-user-action[data-action="open"]'],
  openLabel: ['[data-action="open"] .cp-quick-label', '[data-action="open"] .quick-user-action-label'],
  token: ['.cp-quick[data-action="copy"]', '.quick-user-action[data-action="copy"]'],
  more: ['[data-command="more"]', '.quick-user-more-btn'],
  menu: ['.cp-menu', '.quick-user-more-menu'], menuItem: ['.cp-menu-item', '.quick-user-menu-item'],
  menuIcon: ['.cp-menu-item svg', '.quick-user-menu-item svg'],
};
const properties = [
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'backgroundColor', 'borderRadius',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'gap', 'boxShadow', 'textDecorationLine', 'textUnderlineOffset',
];
async function measure(page, index) {
  return page.evaluate(({ selectors, properties, index }) => {
    const card = index === 0 ? document.querySelector('#cp-flat [data-user="wang"]') : document.getElementById('actual-flat-card');
    const origin = card.getBoundingClientRect();
    const result = {};
    for (const [key, pair] of Object.entries(selectors)) {
      const element = pair[index] ? card.querySelector(pair[index]) : card;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      result[key] = {
        rect: { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height },
        style: Object.fromEntries(properties.map((property) => [property, style[property]])),
      };
    }
    return result;
  }, { selectors, properties, index });
}
function compare(expected, actual, label) {
  const differences = [];
  for (const key of Object.keys(expected)) {
    for (const dimension of ['x', 'y', 'width', 'height']) {
      if (['x', 'y'].includes(dimension) && expected[key].rect.width === 0 && expected[key].rect.height === 0 && actual[key].rect.width === 0 && actual[key].rect.height === 0) continue;
      const e = expected[key].rect[dimension], a = actual[key].rect[dimension];
      if (Math.abs(e - a) > .1) differences.push(`${key}.${dimension}: ${a}，预览 ${e}`);
    }
    for (const property of properties) {
      // 未设置边框时颜色只随文本继承，绘制结果由边框宽度决定。
      if (property.startsWith('border') && property.endsWith('Color')) {
        const width = property.replace('Color', 'Width');
        if (expected[key].style[width] === '0px' && actual[key].style[width] === '0px') continue;
      }
      const e = expected[key].style[property], a = actual[key].style[property];
      if (e !== a) differences.push(`${key}.${property}: ${a}，预览 ${e}`);
    }
  }
  assert.deepEqual(differences, [], label);
}

module.exports = async function verifyFlatReference(browser) {
  const reference = await browser.newPage({ viewport: { width: 736, height: 1000 }, colorScheme: 'light' });
  const actual = await browser.newPage({ viewport: { width: 736, height: 1000 }, colorScheme: 'light' });
  try {
    await reference.setContent(referenceHtml);
    // 保留原始快照；只对齐后续要求的紧凑尺寸和两列布局，核对其余视觉效果。
    await reference.evaluate(() => {
      document.querySelectorAll('#cp-flat .cp-user').forEach((card) => {
        card.querySelector('.cp-head').appendChild(card.querySelector('.cp-phone-row'));
      });
    });
    await reference.addStyleTag({ content: `
      #tenant-card-refined-designs #cp-flat .cp-user { padding:8px 10px 6px; }
      #tenant-card-refined-designs #cp-flat .cp-users { gap:6px; }
      #tenant-card-refined-designs #cp-flat .cp-identity { gap:8px; }
      #tenant-card-refined-designs #cp-flat .cp-head { column-gap:8px;row-gap:1px; }
      #tenant-card-refined-designs #cp-flat .cp-avatar { width:26px;height:26px;flex-basis:26px; }
      #tenant-card-refined-designs #cp-flat .cp-name-line { line-height:18px; }
      #tenant-card-refined-designs #cp-flat .cp-account { line-height:14px; }
      #tenant-card-refined-designs #cp-flat .cp-env { height:28px; }
      #tenant-card-refined-designs #cp-flat .cp-phone-row { grid-column:1;grid-row:2;margin:0 0 0 34px; }
      #tenant-card-refined-designs #cp-flat .cp-time,
      #tenant-card-refined-designs #cp-flat .cp-duties { margin:3px 0 0 34px; }
      #tenant-card-refined-designs #cp-flat .cp-local { margin-top:5px; }
      #tenant-card-refined-designs #cp-flat .cp-port { height:26px;padding:3px 9px; }
      #tenant-card-refined-designs #cp-flat .cp-toolbar { margin-top:6px;padding-top:3px; }
      #tenant-card-refined-designs #cp-flat .cp-quick { min-height:28px;padding:3px 1px; }
      #tenant-card-refined-designs #cp-flat .cp-extras { padding-top:2px; }
      #tenant-card-refined-designs #cp-flat .cp-text { min-height:22px;padding:1px 6px; }
      @container cp-preview (max-width:300px) {
        #tenant-card-refined-designs #cp-flat .cp-phone-row,
        #tenant-card-refined-designs #cp-flat .cp-time,
        #tenant-card-refined-designs #cp-flat .cp-duties { margin-left:0; }
      }
      @media (max-width:400px) { #tenant-card-refined-designs #cp-flat .cp-user { padding:7px 9px 5px; } }
    ` });
    await actual.setContent('<style>' + popupCss + '</style><main id="actual-host" class="quick-user-card-host" style="box-sizing:border-box;width:380px;padding:18px 16px 12px;border:1px solid #dce5d8;border-radius:12px;background:#f5f8f2;color:#243a2a;font:400 13px/1.5 -apple-system,BlinkMacSystemFont,PingFang SC,Microsoft YaHei,sans-serif"><div id="actual-list" style="display:grid;gap:10px"></div></main>');
    await actual.evaluate(() => { window.InternalDevToolkit = {}; });
    await actual.addScriptTag({ path: path.join(root, 'src/popup/user-card.js') });
    await actual.evaluate(() => {
      const records = [
        { id: 'wang', name: '王丽华', account: 'wanglihua01', phone: '13800001234', role: '校长' },
        { id: 'zhang', name: '张强', account: 'zhangqiang02', phone: '13900005678', role: '教师' },
      ];
      records.forEach((person, index) => {
        const card = InternalDevToolkit.userCard.create({
          name: person.name, account: person.account, phone: person.phone, roleLabel: person.role,
          selectable: true, selected: index === 0, adminTokenAvailable: true,
          meta: { id: person.id, userName: person.name, tenantId: 'tenant-1', phone: person.phone, account: person.account },
        });
        if (index === 0) card.id = 'actual-flat-card';
        document.getElementById('actual-list').appendChild(card);
      });
    });
    for (const { width, viewport } of [{ width: 320, viewport: 736 }, { width: 380, viewport: 736 }, { width: 440, viewport: 736 }, { width: 320, viewport: 320 }]) {
      await reference.setViewportSize({ width: viewport, height: 1000 });
      await actual.setViewportSize({ width: viewport, height: 1000 });
      await reference.mouse.move(700, 0);
      await actual.mouse.move(700, 0);
      await reference.locator('#cp-flat').evaluate((panel, width) => { panel.style.width = width + 'px'; }, width);
      await actual.locator('#actual-host').evaluate((panel, width) => { panel.style.width = width + 'px'; }, width);
      const padding = await reference.locator('#cp-flat').evaluate((panel) => getComputedStyle(panel).padding);
      await actual.locator('#actual-host').evaluate((panel, padding) => { panel.style.padding = padding; }, padding);
      await actual.evaluate(() => InternalDevToolkit.userCard.toggleMenu(document.getElementById('actual-flat-card')));
      compare(await measure(reference, 0), await measure(actual, 1), `${width}px 下实际卡片应与已选预览一致`);
      await reference.locator('#cp-flat [data-user="wang"] [data-action="open"]').hover();
      await actual.locator('#actual-flat-card .quick-user-action[data-action="open"]').hover();
      compare(await measure(reference, 0), await measure(actual, 1), `${width}px 下悬浮效果应与已选预览一致`);
      await reference.locator('#cp-flat .cp-menu-item').first().hover();
      await actual.locator('#actual-flat-card .quick-user-menu-item').first().hover();
      compare(await measure(reference, 0), await measure(actual, 1), `${width}px 下菜单悬浮应与已选预览一致`);
      const marks = await Promise.all([
        reference.locator('#cp-flat .cp-menu-item').first().evaluate((element) => getComputedStyle(element, '::before').backgroundColor),
        actual.locator('#actual-flat-card .quick-user-menu-item').first().evaluate((element) => getComputedStyle(element, '::before').backgroundColor),
      ]);
      assert.equal(marks[1], marks[0]);
      await actual.evaluate(() => InternalDevToolkit.userCard.closeMenu(document.getElementById('actual-flat-card')));
    }
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    await reference.locator('#cp-flat [data-user="wang"]').screenshot({ path: path.join(root, 'test-results/user-card-selected-reference.png') });
    await actual.locator('#actual-flat-card').screenshot({ path: path.join(root, 'test-results/user-card-selected-actual.png') });
    console.log('selected user card preview comparison passed: 320/380/440px, geometry, fonts, icons, colors, menu and hover states');
  } finally {
    await reference.close();
    await actual.close();
  }
};
if (require.main === module) {
  (async () => {
    const { chromium } = require('@playwright/test');
    const browser = await chromium.launch({ headless: true });
    try { await module.exports(browser); } finally { await browser.close(); }
  })().catch((error) => { console.error(error); process.exitCode = 1; });
}
