// popup.js

// When the popup is opened, we find the currently active tab
// and then list all tabs in the same domain.



async function setupPage() {

  const isdark = await chrome.storage.local.get("isdark").then(r => +r.isdark);

  if(isdark) document.documentElement.setAttribute('dark',''); else{
    document.documentElement.removeAttribute('dark','');
  }
}

async function getCurrentTab() {
  // Using chrome.tabs.query with 'active' and 'currentWindow' to get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}


const qText = new Array(64).fill('0').join('');
async function getTabsInSameDomain(domain) {
  // Query all tabs across all windows
  const [allTabs,currentWindow] = await Promise.all([chrome.tabs.query({}), chrome.windows.getLastFocused()]);

  // Filter by domain
  return allTabs.filter((t) => {
    let r;
    try {
      r = new URL(t.url).hostname === domain
    } catch (error) {
      r = false;
    };
    if (r) t.isInCurrentWindow = (currentWindow.id === t.windowId);
    if (r) {
      t.titleForCompare = t.title.replace(/\s+/g, ' ').replace(/\d+/g, e => {
        if (e.length > 64) return e;
        return `${qText}${e}`.slice(-64);
      });

    }
    return r;
  }).sort((a, b) => {
    if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
    const cmp = a.titleForCompare.localeCompare(b.titleForCompare, 'en', { sensitivity: 'base' });
    if(cmp !== 0) return cmp;
    return b.id - a.id;
  });;
}

const divOnClick = async (evt)=>{

  const tabId = +evt?.target?.closest('[data-tabid]')?.getAttribute('data-tabid') || 0;
  if (!tabId) return;

  const tab = await chrome.tabs.get(tabId);

  if (tab.discarded) return;

  setTimeout(async ()=>{
    const [currentWindow] = await Promise.all([ chrome.windows.getLastFocused()]);

    const f = async () => {
      await chrome.tabs.update(tabId, { active: true });
      await new Promise(r => setTimeout(r, 80));
      await chrome.tabs.update(tabId, { active: true });
      await new Promise(r => setTimeout(r, 1));
      window.close();
    };
    if(currentWindow.id === tab.windowId){
      f();
    }else{
      chrome.windows.update(tab.windowId, { focused: true }, ()=>{
        setTimeout(f, 0);
      });
    }

  }, 0);
};

const delBtnClick = async (evt)=>{

  evt.preventDefault();
  evt.stopPropagation();
  evt.stopImmediatePropagation();
  const tabId = +evt?.target?.closest('[data-tabid]')?.getAttribute('data-tabid') || 0;
  if (!tabId) return;
  await new Promise(r => setTimeout(r, 1));
  const tab = await chrome.tabs.get(tabId);
  if (tab.id === tabId) await chrome.tabs.remove(tab.id);
  await new Promise(r => setTimeout(r, 1));
  window.close();
}

function createTabElement(tab) {
  const div = document.createElement('div');
  const span = document.createElement('span');
  const delBtn = document.createElement('span');
  delBtn.classList.add('tab-entry-del-btn');
  delBtn.textContent='❌'

  const muted = tab.mutedInfo?.muted ? "[Muted] " : "";
  span.textContent = `${tab.isInCurrentWindow?'🌕':'🌑'} ${muted}${tab.title || tab.url}`;
  div.appendChild(span);
  div.appendChild(delBtn);
  div.classList.add('tab-entry');
  if(tab.pinned) div.classList.add('tab-entry-pinned');
  if(tab.discarded) div.classList.add('tab-entry-discarded');
  if(tab.status !== 'complete') div.classList.add('tab-entry-loading');
  if(tab.isInCurrentWindow) div.classList.add('tab-entry-in-current-window');

  if(tab.audible === true) div.classList.add('tab-entry-audible');

  if(tab.active === false || tab.selected === false) div.classList.add('tab-entry-background');
  if(tab.active === true && tab.selected === true) div.classList.add('tab-entry-foreground');

  div.setAttribute('data-tabid', tab.id);
  div.setAttribute('data-windowid', tab.windowId);


  // Add a click listener to switch to this tab
  div.addEventListener('click', divOnClick);
  delBtn.addEventListener('click',delBtnClick);

  return div;
}

document.addEventListener('DOMContentLoaded', async () => {
  setupPage();

  const tabsList = document.getElementById('tabsList');
  tabsList.textContent = 'Loading...';

  try {
    const currentTab = await getCurrentTab();
    if (!currentTab || !currentTab.url) {
      tabsList.textContent = 'No active tab found.';
      return;
    }

    const currentDomain = new URL(currentTab.url).hostname;
    const matchingTabs = await getTabsInSameDomain(currentDomain);

    console.log(599, matchingTabs);

    // Clear the loading text
    tabsList.innerHTML = '';

    if (matchingTabs.length === 0) {
      tabsList.textContent = 'No matching tabs found.';
    } else {
      // Create an entry for each tab
      matchingTabs.forEach((tab) => {
        const tabElement = createTabElement(tab);
        tabsList.appendChild(tabElement);
      });
    }
  } catch (e) {
    tabsList.textContent = 'Error: ' + e.message;
  }
});
