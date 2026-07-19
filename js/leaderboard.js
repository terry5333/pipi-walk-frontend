// Helper: get current month key "YYYY-MM"
function getMonthKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Helper: get today key "YYYY-MM-DD"
function getTodayKey() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let leaderboardListener = null;
let currentMonthRef = null;

// Subscribe to leaderboard changes
function subscribeLeaderboard(currentUserId) {
    const monthKey = getMonthKey();
    const dbRef = database.ref(`leaderboard/${monthKey}`);
    
    document.getElementById('leaderboard-loading').classList.remove('hidden');

    if (currentMonthRef) {
        currentMonthRef.off('value', leaderboardListener);
    }
    
    currentMonthRef = dbRef;
    
    leaderboardListener = currentMonthRef.orderByChild('totalSteps').on('value', (snapshot) => {
        document.getElementById('leaderboard-loading').classList.add('hidden');
        
        const users = [];
        snapshot.forEach((childSnapshot) => {
            users.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Firebase order by child is ascending by default, we need descending
        users.sort((a, b) => b.totalSteps - a.totalSteps);
        
        renderLeaderboard(users, currentUserId);
    }, (error) => {
        console.error("Leaderboard subscription error:", error);
        document.getElementById('leaderboard-loading').classList.add('hidden');
    });
}

// Unsubscribe from leaderboard
function unsubscribeLeaderboard() {
    if (currentMonthRef && leaderboardListener) {
        currentMonthRef.off('value', leaderboardListener);
        currentMonthRef = null;
        leaderboardListener = null;
    }
}

// Update user's steps in the leaderboard
async function updateLeaderboardEntry(userId, displayName, stepsToAdd) {
    const monthKey = getMonthKey();
    const todayKey = getTodayKey();
    const userRef = database.ref(`leaderboard/${monthKey}/${userId}`);
    
    try {
        const snapshot = await userRef.once('value');
        const current = snapshot.val();
        
        if (current) {
            await userRef.update({
                totalSteps: (current.totalSteps || 0) + stepsToAdd,
                todaySteps: current.lastDate === todayKey 
                    ? (current.todaySteps || 0) + stepsToAdd 
                    : stepsToAdd,
                lastDate: todayKey,
                lastUpdated: new Date().toISOString(),
                name: displayName
            });
        } else {
            await userRef.set({
                name: displayName,
                totalSteps: stepsToAdd,
                todaySteps: stepsToAdd,
                lastDate: todayKey,
                lastUpdated: new Date().toISOString()
            });
        }
    } catch (e) {
        console.error("Failed to update leaderboard entry", e);
    }
}

// Get user's today steps from the database
async function getUserTodaySteps(userId) {
    const monthKey = getMonthKey();
    const todayKey = getTodayKey();
    try {
        const snapshot = await database.ref(`leaderboard/${monthKey}/${userId}`).once('value');
        const data = snapshot.val();
        if (!data) return 0;
        return data.lastDate === todayKey ? (data.todaySteps || 0) : 0;
    } catch (e) {
        console.error("Failed to fetch today's steps", e);
        return 0;
    }
}

// Render leaderboard into the DOM
function renderLeaderboard(users, currentUserId) {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    if (!users || users.length === 0) {
        list.innerHTML = `
            <div class="empty-state py-8 text-center text-[var(--text-tertiary)] flex flex-col items-center gap-2">
                <span class="text-3xl">📊</span>
                <p>還沒有排行榜資料</p>
                <p class="text-sm">開始新增步數來成為第一名吧！</p>
            </div>
        `;
        return;
    }
    
    users.forEach((user, index) => {
        const rank = index + 1;
        let rankClass = 'rank-other';
        let rankContent = rank;
        
        if (rank === 1) { rankClass = 'rank-1'; rankContent = '🥇'; }
        else if (rank === 2) { rankClass = 'rank-2'; rankContent = '🥈'; }
        else if (rank === 3) { rankClass = 'rank-3'; rankContent = '🥉'; }
        
        const isMe = user.id === currentUserId;
        
        const itemHtml = `
            <div class="leaderboard-item ${isMe ? 'is-me' : ''}">
                <div class="leaderboard-rank ${rankClass}">${rankContent}</div>
                <div class="leaderboard-name text-white">
                    ${user.name} ${isMe ? '<span class="text-xs ml-1 text-[var(--accent-coral)]">(你)</span>' : ''}
                </div>
                <div class="leaderboard-steps">
                    ${(user.totalSteps || 0).toLocaleString()} <span class="text-xs font-normal text-[var(--text-secondary)]">步</span>
                </div>
            </div>
        `;
        
        list.insertAdjacentHTML('beforeend', itemHtml);
    });
}
