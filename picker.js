/* Select-only comboboxes. Menus live directly below their buttons in page flow;
   Safari never opens a detached native picker. No viewport/keyboard offsets. */
(function() {
  'use strict';
  const widgets = new WeakMap();
  let opened = null;
  function close() {
    if (!opened) return;
    opened.list.hidden = true;
    opened.button.setAttribute('aria-expanded','false');
    opened.button.removeAttribute('aria-activedescendant');
    opened = null;
  }
  function parts(option) {
    return {label:option?.dataset.label || option?.textContent || '', price:option?.dataset.price};
  }
  function content(node,option) {
    node.replaceChildren();
    const data=parts(option), label=document.createElement('span');
    label.className='choice-name'; label.textContent=WarshaQuote.bidiText(data.label);
    node.append(label);
    if (data.price !== undefined) {
      const price=document.createElement('bdi'); price.className='choice-price'; price.dir='rtl';
      price.textContent=WarshaQuote.formatMoney(Number(data.price)); node.append(price);
    }
  }
  function enhance(select) {
    if (widgets.has(select)) return widgets.get(select);
    const wrapper=document.createElement('div'); wrapper.className='choice';
    const button=document.createElement('button'); button.type='button'; button.className='choice-button'; button.id=select.id+'-trigger';
    button.setAttribute('role','combobox'); button.setAttribute('aria-haspopup','listbox'); button.setAttribute('aria-expanded','false');
    const list=document.createElement('div'); list.id=select.id+'-options'; list.className='choice-menu'; list.hidden=true; list.setAttribute('role','listbox');
    button.setAttribute('aria-controls',list.id);
    const labels=[...select.labels];
    labels.forEach((label,index)=>{ if(!label.id) label.id=select.id+'-label-'+index; label.htmlFor=button.id; });
    const labelIds=labels.map(l=>l.id).join(' ');
    if(labelIds) { button.setAttribute('aria-labelledby',labelIds); list.setAttribute('aria-labelledby',labelIds); }
    if(select.getAttribute('aria-describedby')) button.setAttribute('aria-describedby',select.getAttribute('aria-describedby'));
    select.before(wrapper); wrapper.append(select,button,list);
    select.classList.add('native-select'); select.tabIndex=-1; select.setAttribute('aria-hidden','true');
    const w={select,wrapper,button,list,active:0,signature:'',search:'',typedAt:0}; widgets.set(select,w);
    function highlight(index) {
      w.active=Math.max(0,Math.min(index,list.children.length-1));
      [...list.children].forEach((item,i)=>item.classList.toggle('is-active',i===w.active));
      const item=list.children[w.active];
      if(item) {
        button.setAttribute('aria-activedescendant',item.id);
        // Scroll only the options panel. Do not move the page while navigating.
        if(item.offsetTop<list.scrollTop) list.scrollTop=item.offsetTop;
        else if(item.offsetTop+item.offsetHeight>list.scrollTop+list.clientHeight) list.scrollTop=item.offsetTop+item.offsetHeight-list.clientHeight;
      }
    }
    function open() {
      if(select.disabled) return;
      close(); syncOne(w); opened=w; list.style.maxHeight=''; list.hidden=false; button.setAttribute('aria-expanded','true');
      highlight(Math.max(0,select.selectedIndex));
      // Ensure the nearby panel is visible when opened low on a phone screen.
      const rect=button.getBoundingClientRect(), viewport=window.visualViewport;
      const bottom=(viewport?.offsetTop || 0)+(viewport?.height || innerHeight);
      if(rect.bottom+Math.min(list.offsetHeight,200)>bottom-76) button.scrollIntoView({block:'center',behavior:'instant'});
      const bar=document.getElementById('mobileQuote')?.getBoundingClientRect();
      const usableBottom=Math.min(bottom-12,bar?.height ? bar.top-12 : bottom-12);
      const available=Math.max(100,usableBottom-button.getBoundingClientRect().bottom);
      list.style.maxHeight='min(300px, 40svh, '+available+'px)';
    }
    function choose(index) {
      const option=select.options[index]; if(!option || option.disabled) return;
      select.value=option.value; close();
      select.dispatchEvent(new Event('input',{bubbles:true}));
      select.dispatchEvent(new Event('change',{bubbles:true}));
      syncOne(w); button.focus({preventScroll:true});
    }
    button.addEventListener('click',()=>opened===w?close():open());
    list.addEventListener('pointerdown',event=>event.preventDefault());
    list.addEventListener('click',event=>{const item=event.target.closest('[role=option]'); if(item) choose(Number(item.dataset.index));});
    button.addEventListener('keydown',event=>{
      const key=event.key, isOpen=opened===w;
      if(key==='Escape') { if(isOpen){event.preventDefault();close();} return; }
      if(key==='Tab') { if(isOpen) choose(w.active); return; }
      if(['ArrowDown','ArrowUp','Home','End','PageDown','PageUp','Enter',' '].includes(key)) {
        event.preventDefault();
        if(!isOpen) {open(); if(key==='End')highlight(list.children.length-1);if(key==='Home')highlight(0);return;}
        if(key==='Enter'||key===' ') {choose(w.active);return;}
        highlight(key==='Home'?0:key==='End'?list.children.length-1:w.active+({ArrowDown:1,ArrowUp:-1,PageDown:10,PageUp:-10}[key]));
      } else if(key.length===1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault(); if(!isOpen)open();
        w.search=Date.now()-w.typedAt>800?key:w.search+key; w.typedAt=Date.now();
        const query=WarshaQuote.displayText(w.search).toLowerCase();
        const index=[...select.options].findIndex(o=>parts(o).label.replace(/[\u2066-\u2069]/g,'').toLowerCase().startsWith(query));
        if(index>=0)highlight(index);
      }
    });
    select.addEventListener('focus',()=>button.focus({preventScroll:true}));
    return w;
  }
  function syncOne(w) {
    const {select,button,list}=w;
    if(!select.isConnected) {if(opened===w)close();return;}
    const signature=JSON.stringify([...select.options].map(o=>[o.value,o.textContent,o.dataset.label,o.dataset.price,o.disabled]));
    if(signature!==w.signature) {
      if(opened===w)close(); w.signature=signature; list.replaceChildren();
      [...select.options].forEach((option,index)=>{
        const row=document.createElement('div'); row.className='choice-option'; row.id=list.id+'-'+index;
        row.setAttribute('role','option'); row.dataset.index=index; row.dataset.value=option.value;
        if(option.disabled)row.setAttribute('aria-disabled','true'); content(row,option); list.append(row);
      });
    }
    button.disabled=select.disabled; button.setAttribute('aria-required',String(select.required));
    button.setAttribute('aria-invalid',select.getAttribute('aria-invalid')||'false');
    content(button,select.selectedOptions[0]); button.classList.toggle('is-placeholder',!select.value);
    [...list.children].forEach((row,i)=>row.setAttribute('aria-selected',String(i===select.selectedIndex)));
    if(select.disabled&&opened===w)close();
  }
  document.addEventListener('pointerdown',event=>{if(opened&&!opened.wrapper.contains(event.target))close();});
  document.addEventListener('focusin',event=>{if(opened&&!opened.wrapper.contains(event.target))close();});
  window.WarshaPicker={
    sync(root=document){if(opened&&!opened.select.isConnected)close();root.querySelectorAll('select').forEach(select=>syncOne(enhance(select)));},
    focus(select){const w=widgets.get(select);if(w){syncOne(w);w.button.focus({preventScroll:true});return w.button;}select.focus({preventScroll:true});return select;},
    close
  };
})();
