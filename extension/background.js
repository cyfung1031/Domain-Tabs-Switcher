// background.js (Service Worker)

function updateBadgeCount(tabId) {
  
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        // If the tab no longer exists or any error occurs
        return;
      }
       

      (tab && tab.url)  && (async ()=>{


        const currentDomain = new URL(tab.url).hostname; 

        const injectionResultsPromise = chrome.scripting.executeScript({ target: { tabId: tabId, allFrames: false }, function: ()=>{

          const isDark = document.documentElement.hasAttribute('dark');

          return isDark
        }}); 

        const lenPromise = new Promise(resolve=>{

          // Query all tabs across all windows
          chrome.tabs.query({}, (allTabs) => {
            // Filter tabs that match the domain
            const len = allTabs.filter((t) => {
              try {
                return new URL(t.url).hostname === currentDomain;
              } catch (e) {
                return false;
              }
            }).length;

            resolve(len)
          });

        });

        const [injectionResults, len] = await Promise.all([injectionResultsPromise, lenPromise]);

        const  injectionResult = injectionResults.filter(e=>e.frameId===0)[0];

        let isdark = false;
        if(injectionResult && injectionResult.result === true){

          isdark = true;
        }

        
        chrome.action.setBadgeText({ text: `${len}` });

        if(isdark){
          chrome.action.setBadgeTextColor({ color: "#ebebeb" });
          chrome.action.setBadgeBackgroundColor({ color: "#252525" });

        }else{

          chrome.action.setBadgeTextColor({ color: "#212121" });
          chrome.action.setBadgeBackgroundColor({ color: "#e8e8e8" });
        }

        chrome.storage.local.set({isdark: isdark? `1`:`0`});


        // console.log('isdark', injectionResults);

          // Update badge

      })();
       

    });
  }
  
  const updateActivated =async (tabId)=>{

  const tabInfo = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabInfo[0] && tabInfo[0].url;
  if (url && (url.includes('https://') || url.includes('http://'))) {
    tabId = +tabId;
    if (!tabId || +tabInfo[0].id === tabId) updateBadgeCount(tabInfo[0].id);
  } else {
    chrome.action.setBadgeText({ text: '' })
  }
}

  // Listen for when the user switches (activates) a tab
  chrome.tabs.onActivated.addListener( (activeInfo) => {
    updateActivated(activeInfo.tabId || 0);
    setTimeout(()=>updateActivated(), 100);
  });
  
  // Listen for updates to the tab (URL change, loading, etc.)
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
     updateActivated(tabId || 0);
     setTimeout(()=>updateActivated(), 100);
  });
  
  // Initialize badge when extension first runs
  chrome.runtime.onInstalled.addListener(() => {
    // if (!tab.url.includes('https://') && !tab.url.includes('http://') ) return;
    // We can attempt to set a default badge (e.g., "0") 
    // or update it based on whichever tab is currently active.
    // chrome.action.setBadgeText({ text: "0" });

    updateActivated();
  });
  
  chrome.windows.onFocusChanged.addListener(()=>{

    updateActivated();
    setTimeout(()=>updateActivated(), 100);


  })