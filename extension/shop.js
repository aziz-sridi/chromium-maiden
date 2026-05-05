// Shop functionality
let coins = 1000;
let ownedThemes = ['default'];
let activeTheme = 'default';

// Initialize coins if not set
chrome.storage.local.get(['coins'], (result) => {
  if (result.coins === undefined) {
    chrome.storage.local.set({ coins: 1000 });
  }
});

// Load saved data
chrome.storage.local.get(['coins', 'ownedThemes', 'activeTheme'], (result) => {
  coins = result.coins !== undefined ? result.coins : 1000;
  ownedThemes = result.ownedThemes || ['default'];
  activeTheme = result.activeTheme || 'default';
  
  updateCoinsDisplay();
  updateShopItems();
  updateOwnedThemes();
  applyTheme(activeTheme);
});

// Back button
document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = 'popup.html';
});

// Update coins display
function updateCoinsDisplay() {
  document.getElementById('coinsAmount').textContent = coins;
}

// Update shop items based on ownership
function updateShopItems() {
  const shopItems = document.querySelectorAll('.shop-item');
  
  shopItems.forEach(item => {
    const theme = item.dataset.theme;
    const buyBtn = item.querySelector('.buy-btn');
    
    if (ownedThemes.includes(theme)) {
      buyBtn.textContent = 'Owned';
      buyBtn.disabled = true;
      buyBtn.classList.add('owned');
      item.classList.add('owned');
    }
  });
}

// Handle purchase
document.querySelectorAll('.buy-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const theme = e.target.dataset.theme;
    const item = e.target.closest('.shop-item');
    const price = parseInt(item.dataset.price);
    
    if (ownedThemes.includes(theme)) {
      showNotification('you already have this one', 'info');
      return;
    }
    
    if (coins >= price) {
      // Deduct coins
      coins -= price;
      
      // Add theme to owned
      ownedThemes.push(theme);
      
      // Save to storage
      chrome.storage.local.set({ 
        coins: coins, 
        ownedThemes: ownedThemes 
      }, () => {
        updateCoinsDisplay();
        updateShopItems();
        updateOwnedThemes();
        showNotification(`got ${getThemeName(theme)}!`, 'success');
      });
    } else {
      showNotification(`need ${price - coins} more coins`, 'error');
    }
  });
});

// Get theme display name
function getThemeName(theme) {
  const names = {
    'blondie': 'Blondie Maid',
    'gigia': 'Gigia',
    'potato': 'Potato'
  };
  return names[theme] || theme;
}

// Update owned themes display
function updateOwnedThemes() {
  const ownedGrid = document.getElementById('ownedThemes');
  
  // Keep default theme
  ownedGrid.innerHTML = `
    <div class="owned-item ${activeTheme === 'default' ? 'active' : ''}" data-theme="default">
      <div class="owned-preview">
        <img src="mascots/default_maid/maid_ok.jpeg" class="owned-mascot-img" alt="Default Maid">
      </div>
      <p>Default Maid</p>
      ${activeTheme === 'default' ? '<span class="active-badge">Active</span>' : '<button class="activate-btn">Activate</button>'}
    </div>
  `;
  
  // Add owned themes
  ownedThemes.forEach(theme => {
    if (theme === 'default') return;
    
    const themeData = getThemeData(theme);
    const isActive = activeTheme === theme;
    
    ownedGrid.innerHTML += `
      <div class="owned-item ${isActive ? 'active' : ''}" data-theme="${theme}">
        <div class="owned-preview">
          <img src="${themeData.image}" class="owned-mascot-img" alt="${themeData.name}">
        </div>
        <p>${themeData.name}</p>
        ${isActive ? '<span class="active-badge">Active</span>' : '<button class="activate-btn">Activate</button>'}
      </div>
    `;
  });
  
  // Add click handlers for activation
  document.querySelectorAll('.activate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.owned-item');
      const theme = item.dataset.theme;
      activateTheme(theme);
    });
  });
}

// Get theme data
function getThemeData(theme) {
  const themes = {
    'blondie': {
      name: 'Blondie Maid',
      image: 'mascots/for_sale/blondie maid.png'
    },
    'gigia': {
      name: 'Gigia',
      image: 'mascots/for_sale/gigia.png'
    },
    'potato': {
      name: 'Potato',
      image: 'mascots/for_sale/potato.png'
    }
  };
  return themes[theme];
}

// Activate theme
function activateTheme(theme) {
  activeTheme = theme;
  
  chrome.storage.local.set({ activeTheme: theme }, () => {
    // Update mascot shown in score display
    updateOwnedThemes();
    showNotification(`${getThemeName(theme) || 'Default Maid'} active`, 'success');
  });
}

// Apply theme (removed - we use mascots now, not themes)
function applyTheme(theme) {
  // Mascots are shown in the score display in contentScript
  // No color theme changes needed
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Initialize
updateCoinsDisplay();
updateShopItems();
updateOwnedThemes();
