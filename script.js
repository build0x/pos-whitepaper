// 目录生成、滚动与复制
(function(){
  const tocEl = document.getElementById('toc');
  const sections = Array.from(document.querySelectorAll('main section'));
  const url = new URL(location.href);
  const addrFromUrl = url.searchParams.get('token');
  const poolFromUrl = url.searchParams.get('pool');

  // 生成目录
  sections.forEach(sec => {
    const title = sec.dataset.title || sec.querySelector('h2')?.textContent || 'Section';
    const a = document.createElement('a');
    a.href = `#${sec.id}`;
    a.textContent = title;
    tocEl.appendChild(a);
  });

  // 平滑滚动 & 高亮（使用 scrollIntoView + section 的 scroll-margin-top）
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if(!a) return;
    const id = a.getAttribute('href').slice(1);
    const target = document.getElementById(id);
    if(target){
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  const links = Array.from(tocEl.querySelectorAll('a'));
  // 同步移动端chips点击跳转
  // DOM 就绪后单独绑定移动端导航点击，确保在设备切换时仍可用
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.mobile-tabs a').forEach(a=>{
      a.addEventListener('click', (e)=>{
        const id = a.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if(target){
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  });
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${entry.target.id}`));
        // 同步移动端tabs高亮
        document.querySelectorAll('.mobile-tabs a').forEach(t => t.classList.toggle('active', t.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 1] });
  sections.forEach(sec => obs.observe(sec));

  // 移动端目录按钮
  // 移除移动端目录按钮功能

  // 复制合约地址
  function copy(text){
    navigator.clipboard?.writeText(text).then(()=>{
      toast('已复制到剪贴板');
    }).catch(()=>{
      const area = document.createElement('textarea');
      area.value = text; document.body.appendChild(area); area.select();
      try{ document.execCommand('copy'); toast('已复制到剪贴板'); }finally{ area.remove(); }
    });
  }
  const copyBtn = document.getElementById('copyAddress');
  const addrEl = document.getElementById('contractAddress');
  if(addrFromUrl && addrEl){ addrEl.textContent = addrFromUrl; }
  const poolEl = document.getElementById('poolAddress');
  if(poolFromUrl && poolEl){ poolEl.textContent = poolFromUrl; }
  const addr = addrEl?.textContent?.trim();
  copyBtn?.addEventListener('click', ()=> copy(addr));
  document.querySelectorAll('[data-copy]')?.forEach(btn => btn.addEventListener('click', ()=> copy(btn.getAttribute('data-copy'))));

  // 年份
  const yearEl = document.getElementById('year');
  if(yearEl) yearEl.textContent = new Date().getFullYear();

  // 简易吐司
  function toast(message){
    const t = document.createElement('div');
    t.textContent = message;
    Object.assign(t.style, {
      position:'fixed', bottom:'26px', left:'50%', transform:'translateX(-50%)',
      background:'rgba(17,24,39,.9)', color:'#e7eef7', padding:'10px 14px', borderRadius:'12px',
      border:'1px solid rgba(255,255,255,.16)', zIndex:50, transition:'opacity .3s', opacity:'0'
    });
    document.body.appendChild(t);
    requestAnimationFrame(()=> t.style.opacity = '1');
    setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=> t.remove(), 300); }, 1600);
  }
})();

// 导出为 PPT
(function(){
  const btn = document.getElementById('exportPpt');
  if(!btn) return;

  function loadScript(src){
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureLibLoaded(){
    if(typeof PptxGenJS !== 'undefined') return true;
    try{
      await loadScript('https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js');
      return typeof PptxGenJS !== 'undefined';
    }catch(e){ return false; }
  }

  async function ensureHtml2Canvas(){
    if(typeof html2canvas !== 'undefined') return true;
    try{
      await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
      return typeof html2canvas !== 'undefined';
    }catch(e){ return false; }
  }

  async function ensureDomToImage(){
    if(typeof domtoimage !== 'undefined') return true;
    try{
      await loadScript('https://cdn.jsdelivr.net/npm/dom-to-image-more@3.3.0/dist/dom-to-image-more.min.js');
      return typeof domtoimage !== 'undefined';
    }catch(e){ return false; }
  }

  btn.addEventListener('click', async () => {
    const ok = await ensureLibLoaded();
    if(!ok){
      alert('PPT 导出库加载失败，请检查网络后重试，或换用“打印→另存为 PDF”。');
      return;
    }
    alert('正在生成 PPT（结构化版本），请稍候 1-3 秒…');
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'LAYOUT_WIDE', width:13.33, height:7.5 });
    pptx.layout = 'LAYOUT_WIDE';

    // 样式
    const titleStyle = { x:0.6, y:0.6, w:12, fontSize:34, bold:true, color:'FFFFFF' };
    const subStyle = { x:0.6, y:1.4, w:12, fontSize:18, color:'BFD3FF' };
    const h2Style = { x:0.6, y:0.6, w:12, fontSize:28, bold:true, color:'FFFFFF' };
    const listStyle = { x:0.8, y:1.4, w:11.6, fontSize:18, color:'FFFFFF', bullet:true, lineSpacingMultiple:1.2 };
    const slideBg = { color:'1B2433' };

    try{
      // 封面
      const ttl = document.querySelector('.titles h1')?.textContent || 'POS 白皮书';
      const sub = document.querySelector('.subtitle')?.textContent || '';
      let slide = pptx.addSlide();
      slide.background = slideBg;
      slide.addText(ttl, titleStyle);
      if(sub) slide.addText(sub, subStyle);

      function addListSlide(sectionSelector, titleText, items){
        const s = pptx.addSlide(); s.background = slideBg;
        s.addText(titleText, h2Style);
        s.addText(items, listStyle);
      }

      // 项目简介（从 intro 两张卡片汇总）
      const why = Array.from(document.querySelectorAll('#intro .card:nth-of-type(1) li')).map(li=>li.textContent.trim());
      const values = Array.from(document.querySelectorAll('#intro .card:nth-of-type(2) li')).map(li=>li.textContent.trim());
      addListSlide('#intro', '项目简介 · 为什么与众不同', why);
      addListSlide('#intro', '项目简介 · 价值主张', values);

      // 核心痛点与解决方案
      const pains = Array.from(document.querySelectorAll('#problem li')).map(li=>li.textContent.trim());
      addListSlide('#problem', '核心痛点与解决方案', pains);

      // 如何参与（步骤）
      const steps = Array.from(document.querySelectorAll('#how .step')).map(step=>{
        const h = step.querySelector('h3')?.textContent?.trim() || '';
        const p = step.querySelector('p')?.textContent?.trim() || '';
        return `${h}：${p}`;
      });
      addListSlide('#how', '如何参与', steps);

      // 激励机制（左侧要点 + 右侧表格）
      const rewards = Array.from(document.querySelectorAll('#rewards .grid li')).map(li=>li.textContent.trim());
      addListSlide('#rewards', '互助激励机制 · 要点', rewards);
      // 表格
      const rows = Array.from(document.querySelectorAll('#rewards table tbody tr')).map(tr=>{
        const tds = Array.from(tr.querySelectorAll('td')).map(td=>td.textContent.trim());
        return tds;
      });
      const tableSlide = pptx.addSlide(); tableSlide.background = slideBg;
      tableSlide.addText('互助激励机制 · 等级表', h2Style);
      tableSlide.addTable([
        [{ text:'等级', options:{bold:true}}, {text:'团队有效地址', options:{bold:true}}, {text:'团队收益奖励', options:{bold:true}}],
        ...rows
      ], { x:0.8, y:1.4, w:11.6, colW:[2.2,4.8,4.6], fontSize:16, color:'FFFFFF', border:{type:'solid', color:'6B6F7B', pt:1} });

      // 合约与矿池
      const tokenAddr = document.getElementById('contractAddress')?.textContent?.trim() || '';
      const poolAddr = document.getElementById('poolAddress')?.textContent?.trim() || '';
      const tokenSlide = pptx.addSlide(); tokenSlide.background = slideBg;
      tokenSlide.addText('代币与合约信息', h2Style);
      tokenSlide.addText([`代币合约：${tokenAddr}`, `矿池地址：${poolAddr}`, '标准：ERC-20 · 精度：18'], { ...listStyle, bullet:false });

      // 路线图
      const roadmap = Array.from(document.querySelectorAll('#roadmap li')).map(li=>li.textContent.trim());
      addListSlide('#roadmap', '路线图', roadmap);

      // FAQ
      const faqs = Array.from(document.querySelectorAll('#faq details')).map(d=>{
        const q = d.querySelector('summary')?.textContent?.trim() || '';
        const a = d.querySelector('p')?.textContent?.trim() || '';
        return `${q}：${a}`;
      });
      addListSlide('#faq', '常见问题（节选）', faqs);

      // 兼容下载：优先使用 blob，再手动触发保存
      if(pptx.write){
        const blob = await pptx.write('blob');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'POS-白皮书.pptx';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=> URL.revokeObjectURL(url), 1500);
      }else{
        await pptx.writeFile({ fileName: 'POS-白皮书.pptx' });
      }
      alert('PPT 已生成，如未看到下载，请允许浏览器下载。');
    }catch(err){
      console.error(err);
      alert('生成失败：' + (err?.message || err) + '\n可先用 “Ctrl+P → 另存为 PDF” 作为临时方案。');
    }
  });
})();

// 导出整页为高清PNG
(function(){
  function init(){
    const btn = document.getElementById('exportPoster');
    if(!btn) return false;

  function loadScript(src){
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function ensureHtml2Canvas(){
    if(typeof html2canvas !== 'undefined') return true;
    try{ await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'); return true; }
    catch(e){ return false; }
  }

  btn.addEventListener('click', async () => {
    const ok = await ensureHtml2Canvas();
    if(!ok){ alert('截图库加载失败，请联网后重试'); return; }
    const main = document.querySelector('main');
    if(!main){ alert('未找到主要内容'); return; }
    // 展开所有 details 以截图
    const opened = [];
    document.querySelectorAll('details').forEach(d=>{ if(!d.open){ d.open = true; opened.push(d); } });
    const canvas = await html2canvas(main, { backgroundColor:'#0a0f16', scale:3, useCORS:true, windowWidth: document.body.scrollWidth, windowHeight: main.scrollHeight });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = 'POS_长图海报.png'; document.body.appendChild(a); a.click(); a.remove();
    opened.forEach(d=> d.open = false);
  });
    return true;
  }
  if(!init()){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  }
})();

// 交易可视化模块已按需求移除


