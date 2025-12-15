// 상태 관리
let participants = [];
try {
    participants = JSON.parse(localStorage.getItem('participants')) || [];
} catch (e) {
    participants = [];
}

let selectedParticipants = new Set();
try {
    selectedParticipants = new Set(JSON.parse(localStorage.getItem('selectedParticipants')) || []);
} catch (e) {
    selectedParticipants = new Set();
}

let history = [];
try {
    history = JSON.parse(localStorage.getItem('lotteryHistory')) || [];
} catch (e) {
    history = [];
}

let fortuneMode = false;
try {
    fortuneMode = JSON.parse(localStorage.getItem('fortuneMode')) || false;
} catch (e) {
    fortuneMode = false;
}
let todayLuckyPerson = null;

// 참가자 데이터 마이그레이션 (기존 데이터에 새 필드 추가)
let needsMigration = participants.some(p => p.consecutiveWins === undefined);
participants = participants.map(p => ({
    ...p,
    consecutiveWins: p.consecutiveWins || 0,
    hasExemption: p.hasExemption || false,
    exemptionUsed: p.exemptionUsed || false
}));
if (needsMigration && participants.length > 0) {
    localStorage.setItem('participants', JSON.stringify(participants));
}

// HTML 이스케이프 함수
function escapeHtml(text) {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 룰렛 색상
const rouletteColors = [
    '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

// DOM 요소
const participantNameInput = document.getElementById('participantName');
const addBtn = document.getElementById('addBtn');
const participantList = document.getElementById('participantList');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const winnerCountInput = document.getElementById('winnerCount');
const selectedCountSpan = document.getElementById('selectedCount');
const drawBtn = document.getElementById('drawBtn');
const resultSection = document.getElementById('resultSection');
const slotMachine = document.getElementById('slotMachine');
const winnersDisplay = document.getElementById('winnersDisplay');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const celebrationOverlay = document.getElementById('celebrationOverlay');
const confettiContainer = document.getElementById('confettiContainer');
const winnerAnnouncement = document.getElementById('winnerAnnouncement');
const closeOverlayBtn = document.getElementById('closeOverlayBtn');
const fortuneModeToggle = document.getElementById('fortuneModeToggle');
const fortuneHint = document.getElementById('fortuneHint');
const fortuneAnimation = document.getElementById('fortuneAnimation');
const fortuneText = document.getElementById('fortuneText');
const statsChart = document.getElementById('statsChart');
const statsSummary = document.getElementById('statsSummary');

// 다트 게임 DOM 요소
const dartOverlay = document.getElementById('dartOverlay');
const dartboardCanvas = document.getElementById('dartboardCanvas');
const stuckDarts = document.getElementById('stuckDarts');
const flyingDart = document.getElementById('flyingDart');
const dartRound = document.getElementById('dartRound');
const dartWinnerDisplay = document.getElementById('dartWinnerDisplay');

// 초기화
init();

function init() {
    renderParticipants();
    renderHistory();
    renderStats();
    updateSelectedCount();
    setupEventListeners();
    initFortuneMode();
}

function setupEventListeners() {
    addBtn.addEventListener('click', addParticipant);
    participantNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addParticipant();
    });
    selectAllBtn.addEventListener('click', selectAll);
    deselectAllBtn.addEventListener('click', deselectAll);
    drawBtn.addEventListener('click', startDraw);
    clearHistoryBtn.addEventListener('click', clearHistory);
    closeOverlayBtn.addEventListener('click', closeCelebration);
    fortuneModeToggle.addEventListener('change', toggleFortuneMode);
    // 당첨자 수 변경 시 확률 재계산
    winnerCountInput.addEventListener('change', renderParticipants);
    winnerCountInput.addEventListener('input', renderParticipants);
}

// 운세 모드 초기화
function initFortuneMode() {
    fortuneModeToggle.checked = fortuneMode;
    updateFortuneHint();
    if (fortuneMode) {
        calculateTodayLuckyPerson();
    }
}

// 운세 모드 토글
function toggleFortuneMode() {
    fortuneMode = fortuneModeToggle.checked;
    localStorage.setItem('fortuneMode', JSON.stringify(fortuneMode));
    updateFortuneHint();
    if (fortuneMode) {
        calculateTodayLuckyPerson();
    } else {
        todayLuckyPerson = null;
    }
    renderParticipants();
}

// 오늘의 행운아 계산 (날짜 기반 시드)
function calculateTodayLuckyPerson() {
    const selected = participants.filter(p => selectedParticipants.has(p.name) && !p.hasExemption);
    if (selected.length === 0) {
        todayLuckyPerson = null;
        updateFortuneHint();
        return;
    }

    // 날짜를 시드로 사용하여 일관된 행운아 선정
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % selected.length;
    todayLuckyPerson = selected[index].name;
    updateFortuneHint();
}

// 운세 힌트 업데이트 (행운아는 룰렛 돌릴 때 공개)
function updateFortuneHint() {
    if (fortuneMode) {
        fortuneHint.textContent = '추첨 시 오늘의 행운아가 공개됩니다';
    } else {
        fortuneHint.textContent = '';
    }
}

// 참가자 추가
function addParticipant() {
    const name = participantNameInput.value.trim();
    if (!name) return;

    if (participants.some(p => p.name === name)) {
        alert('이미 등록된 참가자입니다.');
        return;
    }

    participants.push({
        name,
        winCount: 0,
        consecutiveWins: 0,
        hasExemption: false,
        exemptionUsed: false
    });
    selectedParticipants.add(name);
    saveData();
    renderParticipants();
    renderStats();
    updateSelectedCount();
    if (fortuneMode) calculateTodayLuckyPerson();
    participantNameInput.value = '';
    participantNameInput.focus();
}

// 참가자 삭제
function deleteParticipant(name) {
    participants = participants.filter(p => p.name !== name);
    selectedParticipants.delete(name);
    saveData();
    renderParticipants();
    renderStats();
    updateSelectedCount();
    if (fortuneMode) calculateTodayLuckyPerson();
}

// 참가자 선택 토글
function toggleParticipant(name) {
    if (selectedParticipants.has(name)) {
        selectedParticipants.delete(name);
    } else {
        selectedParticipants.add(name);
    }
    saveData();
    renderParticipants();
    updateSelectedCount();
    if (fortuneMode) calculateTodayLuckyPerson();
}

// 전체 선택
function selectAll() {
    participants.forEach(p => selectedParticipants.add(p.name));
    saveData();
    renderParticipants();
    updateSelectedCount();
    if (fortuneMode) calculateTodayLuckyPerson();
}

// 전체 해제
function deselectAll() {
    selectedParticipants.clear();
    saveData();
    renderParticipants();
    updateSelectedCount();
    if (fortuneMode) calculateTodayLuckyPerson();
}

// 가중치 계수 계산 (당첨자 수에 따라 동적 조정)
function getWeightFactor() {
    const winnerCount = parseInt(winnerCountInput.value) || 1;
    const eligibleCount = participants.filter(p => selectedParticipants.has(p.name) && !p.hasExemption).length;

    // 당첨자 비율이 높을수록 가중치 효과 감소
    // 1명 당첨: 0.2, 절반 당첨: 0.1, 전원 당첨: 0.05
    const ratio = Math.min(winnerCount / Math.max(eligibleCount, 1), 1);
    return 0.2 * (1 - ratio * 0.75);
}

// 확률 계산 (운세 모드 포함)
function calculateProbabilities(applyFortune = false) {
    const selected = participants.filter(p => selectedParticipants.has(p.name) && !p.hasExemption);
    if (selected.length === 0) return {};

    const weights = {};
    let totalWeight = 0;

    // 당첨자 수에 따라 가중치 계수 동적 조정
    const weightFactor = getWeightFactor();
    selected.forEach(p => {
        let weight = 1 / (1 + p.winCount * weightFactor);
        weights[p.name] = weight;
        totalWeight += weight;
    });

    // 확률로 변환
    const probabilities = {};
    selected.forEach(p => {
        probabilities[p.name] = (weights[p.name] / totalWeight) * 100;
    });

    // 운세 모드 적용: 행운아 -5%, 나머지 +분배
    if (applyFortune && fortuneMode && todayLuckyPerson && probabilities[todayLuckyPerson] !== undefined) {
        const luckyReduction = 5;
        const othersCount = Object.keys(probabilities).length - 1;

        if (othersCount > 0) {
            const actualReduction = Math.min(luckyReduction, probabilities[todayLuckyPerson] - 1);
            probabilities[todayLuckyPerson] -= actualReduction;
            const bonus = actualReduction / othersCount;

            Object.keys(probabilities).forEach(name => {
                if (name !== todayLuckyPerson) {
                    probabilities[name] += bonus;
                }
            });
        }
    }

    return probabilities;
}

// 확률 등급 결정
function getProbabilityClass(probability, avgProbability) {
    if (probability >= avgProbability * 1.2) return 'high';
    if (probability <= avgProbability * 0.8) return 'low';
    return 'medium';
}

// 참가자 목록 렌더링
function renderParticipants() {
    if (participants.length === 0) {
        participantList.innerHTML = '<div class="empty-message">참가자를 추가해주세요</div>';
        return;
    }

    // 목록에는 운세 효과 없이 기본 확률만 표시 (행운아는 추첨 시 공개)
    const probabilities = calculateProbabilities(false);
    const selectedList = participants.filter(p => selectedParticipants.has(p.name) && !p.hasExemption);
    const avgProbability = selectedList.length > 0 ? 100 / selectedList.length : 0;

    participantList.innerHTML = participants.map(p => {
        const isSelected = selectedParticipants.has(p.name);
        const probability = probabilities[p.name] || 0;
        const probClass = getProbabilityClass(probability, avgProbability);

        let exemptionBadge = '';
        if (p.hasExemption) {
            exemptionBadge = '<span class="exemption-badge">🛡️ 면제권</span>';
        }

        let streakBadge = '';
        if (p.consecutiveWins >= 2) {
            streakBadge = `<span class="streak-badge">🔥 ${p.consecutiveWins}연속</span>`;
        }

        const escapedName = p.name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
        const displayName = escapeHtml(p.name);

        return `
            <div class="participant-item ${isSelected ? 'selected' : ''} ${p.hasExemption ? 'has-exemption' : ''}" onclick="toggleParticipant('${escapedName}')">
                <input type="checkbox" class="participant-checkbox"
                    ${isSelected ? 'checked' : ''}
                    onclick="event.stopPropagation(); toggleParticipant('${escapedName}')">
                <span class="participant-name">${displayName}</span>
                <div class="participant-badges">
                    ${exemptionBadge}
                    ${streakBadge}
                </div>
                <div class="participant-stats">
                    <span class="win-count">🏆 ${p.winCount}회 당첨</span>
                    ${isSelected ? `<span class="probability ${probClass}">${p.hasExemption ? '면제' : probability.toFixed(1) + '%'}</span>` : ''}
                </div>
                <button class="participant-delete" onclick="event.stopPropagation(); deleteParticipant('${escapedName}')">✕</button>
            </div>
        `;
    }).join('');
}

// 선택된 참가자 수 업데이트
function updateSelectedCount() {
    selectedCountSpan.textContent = selectedParticipants.size;
}

// 추첨 시작
async function startDraw() {
    const selected = participants.filter(p => selectedParticipants.has(p.name));
    let winnerCount = parseInt(winnerCountInput.value) || 1;

    // 당첨자 수 유효성 검사
    if (winnerCount < 1) {
        winnerCount = 1;
        winnerCountInput.value = 1;
    }

    if (selected.length === 0) {
        alert('추첨할 참가자를 선택해주세요.');
        return;
    }

    const exemptedParticipants = selected.filter(p => p.hasExemption);
    const eligibleParticipants = selected.filter(p => !p.hasExemption);

    if (exemptedParticipants.length > 0) {
        const exemptedNames = exemptedParticipants.map(p => p.name).join(', ');
        alert(`🛡️ 면제권 발동!\n${exemptedNames}님이 이번 추첨에서 면제됩니다.`);
    }

    if (eligibleParticipants.length === 0) {
        alert('면제권을 제외하면 추첨 가능한 참가자가 없습니다.');
        return;
    }

    if (winnerCount > eligibleParticipants.length) {
        alert(`추첨 가능한 참가자(${eligibleParticipants.length}명)보다 많은 당첨자를 선택할 수 없습니다.\n(면제권 보유자 ${exemptedParticipants.length}명 제외)`);
        return;
    }

    drawBtn.disabled = true;

    // 다트 게임 애니메이션 실행
    const winners = await runDartAnimation(eligibleParticipants, winnerCount);

    // 결과 섹션 표시
    resultSection.classList.add('active');

    // 당첨자 표시
    displayWinners(winners, exemptedParticipants);

    // 당첨 기록 업데이트
    updateWinRecords(winners, exemptedParticipants);

    // 이력 저장
    saveHistory(winners, exemptedParticipants);

    // 통계 업데이트
    renderStats();

    drawBtn.disabled = false;
}

// 다트 게임 애니메이션
async function runDartAnimation(eligibleParticipants, winnerCount) {
    // ===== 백그라운드에서 모든 당첨자 미리 계산 (중복 없이) =====
    const preCalculatedWinners = [];
    let remainingForCalc = [...eligibleParticipants];
    let probsForCalc = calculateProbabilities(fortuneMode);

    for (let i = 0; i < winnerCount; i++) {
        if (remainingForCalc.length === 0) break;

        // 가중치 기반으로 1명 당첨자 결정
        const winner = weightedDrawSingle(remainingForCalc, probsForCalc);
        preCalculatedWinners.push(winner);

        // 당첨자를 남은 참가자에서 제거 (중복 방지)
        remainingForCalc = remainingForCalc.filter(p => p.name !== winner.name);

        // 확률 재계산
        if (remainingForCalc.length > 0) {
            probsForCalc = recalculateProbabilities(remainingForCalc, fortuneMode);
        }
    }

    // ===== 애니메이션 시작 =====
    // 다트 오버레이 표시
    dartOverlay.classList.add('active');

    // 꽂힌 다트 초기화
    stuckDarts.innerHTML = '';

    // ===== 다트판 단계별 애니메이션 =====
    // 선택된 전체 참가자 (면제권 포함)
    const allSelectedParticipants = participants.filter(p => selectedParticipants.has(p.name));

    // 1단계: 균등 확률 (1/n) - 모든 선택된 참가자
    const equalProbs = {};
    const equalProbValue = 100 / allSelectedParticipants.length;
    allSelectedParticipants.forEach(p => {
        equalProbs[p.name] = equalProbValue;
    });
    drawDartboard(allSelectedParticipants, equalProbs);
    await delay(800);

    // 2단계: 면제권 보유자 제외 (1/(n-k))
    const exemptedParticipants = allSelectedParticipants.filter(p => p.hasExemption);
    if (exemptedParticipants.length > 0) {
        // 면제권자 제외 후 균등 확률
        const afterExemptProbs = {};
        const afterExemptValue = 100 / eligibleParticipants.length;
        eligibleParticipants.forEach(p => {
            afterExemptProbs[p.name] = afterExemptValue;
        });
        await animateDartboardTransition(allSelectedParticipants, equalProbs, eligibleParticipants, afterExemptProbs, 600);
        await delay(500);
    }

    // 3단계: 당첨 횟수에 따른 가중치 적용
    const weightedProbs = calculateProbabilities(false); // 운세 미적용
    await animateDartboardTransition(eligibleParticipants,
        exemptedParticipants.length > 0 ? (() => {
            const p = {};
            eligibleParticipants.forEach(pp => p[pp.name] = 100 / eligibleParticipants.length);
            return p;
        })() : equalProbs,
        eligibleParticipants, weightedProbs, 600);
    await delay(500);

    // 4단계: 운세 모드 적용 (활성화된 경우)
    let finalProbabilities = weightedProbs;
    if (fortuneMode && todayLuckyPerson) {
        await showFortuneAnimation();
        finalProbabilities = calculateProbabilities(true); // 운세 적용
        await animateDartboardTransition(eligibleParticipants, weightedProbs, eligibleParticipants, finalProbabilities, 600);
        await delay(500);
    }

    // 미리 계산된 당첨자들에게 순차적으로 다트 던지기
    for (let i = 0; i < preCalculatedWinners.length; i++) {
        const winner = preCalculatedWinners[i];

        // 몇 번째 다트인지 표시
        if (winnerCount > 1) {
            showDartRound(i + 1, winnerCount);
        }

        // 당첨자의 과녁 위치 계산
        const targetPosition = calculateTargetPosition(eligibleParticipants, finalProbabilities, winner.name);

        // 다트 날아가는 애니메이션
        await throwDart(targetPosition);

        // 다트 꽂기
        addStuckDart(targetPosition, winner.name, i + 1);

        // 당첨자 표시 애니메이션
        await showDartWinner(winner.name, i + 1);

        // 다음 다트 전 잠시 대기
        if (i < preCalculatedWinners.length - 1) {
            await delay(800);
        }
    }

    // 최종 대기 후 오버레이 닫기
    await delay(1500);
    hideDartRound();
    dartOverlay.classList.remove('active');

    return preCalculatedWinners;
}

// 다트판 부드러운 전환 애니메이션
function animateDartboardTransition(fromParticipants, fromProbs, toParticipants, toProbs, duration) {
    return new Promise((resolve) => {
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // easeInOutCubic for smooth transition
            const eased = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            // 중간 확률 계산
            const interpolatedProbs = {};

            // toParticipants 기준으로 보간
            toParticipants.forEach(p => {
                const fromValue = fromProbs[p.name] || 0;
                const toValue = toProbs[p.name] || 0;
                interpolatedProbs[p.name] = fromValue + (toValue - fromValue) * eased;
            });

            // 제외되는 참가자들 (fromParticipants에만 있는 경우)
            fromParticipants.forEach(p => {
                if (!toProbs[p.name]) {
                    const fromValue = fromProbs[p.name] || 0;
                    interpolatedProbs[p.name] = fromValue * (1 - eased);
                }
            });

            // 현재 표시할 참가자 목록 결정
            const currentParticipants = progress < 1
                ? fromParticipants.filter(p => interpolatedProbs[p.name] > 0.5)
                : toParticipants;

            drawDartboard(currentParticipants, interpolatedProbs);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                resolve();
            }
        }

        requestAnimationFrame(animate);
    });
}

// 다트판 (파이 형태) 그리기 - 확률에 따라 파이 조각 크기 결정
function drawDartboard(participants, probabilities) {
    const canvas = dartboardCanvas;
    const ctx = canvas.getContext('2d');
    const size = 400;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 10;

    // 배경
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.fill();

    // 파이 조각 그리기 (룰렛 스타일)
    let startAngle = -Math.PI / 2; // 12시 방향부터 시작

    participants.forEach((p, i) => {
        const prob = probabilities[p.name] || 0;
        const sliceAngle = (prob / 100) * Math.PI * 2;

        if (sliceAngle < 0.01) {
            startAngle += sliceAngle;
            return; // 너무 작은 조각은 건너뜀
        }

        // 파이 조각 그리기
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, maxRadius, startAngle, startAngle + sliceAngle);
        ctx.closePath();

        ctx.fillStyle = rouletteColors[i % rouletteColors.length];
        ctx.fill();

        // 테두리
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 이름과 확률 표시 (파이 조각 중앙에)
        const midAngle = startAngle + sliceAngle / 2;

        if (sliceAngle > 0.25) { // 영역이 충분히 크면 이름 + 확률 표시
            const textRadius = maxRadius * 0.68;
            const textX = centerX + Math.cos(midAngle) * textRadius;
            const textY = centerY + Math.sin(midAngle) * textRadius;

            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(midAngle + Math.PI / 2);

            // 이름
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let displayName = p.name;
            if (displayName.length > 6) {
                displayName = displayName.substring(0, 5) + '..';
            }
            ctx.fillText(displayName, 0, -7);

            // 확률 (이름 아래에)
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.font = '10px sans-serif';
            ctx.fillText(prob.toFixed(1) + '%', 0, 7);

            ctx.restore();
        } else if (sliceAngle > 0.12) { // 조금 작으면 이름만
            const textRadius = maxRadius * 0.65;
            const textX = centerX + Math.cos(midAngle) * textRadius;
            const textY = centerY + Math.sin(midAngle) * textRadius;

            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(midAngle + Math.PI / 2);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let displayName = p.name;
            if (displayName.length > 4) {
                displayName = displayName.substring(0, 3) + '..';
            }
            ctx.fillText(displayName, 0, 0);
            ctx.restore();
        }

        startAngle += sliceAngle;
    });

    // 중앙 원
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 중앙 점
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
}

// 당첨자의 과녁 위치 계산 (파이 형태)
function calculateTargetPosition(participants, probabilities, winnerName) {
    const canvas = dartboardCanvas;
    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 10;

    // 파이 조각에서 해당 참가자의 각도 범위 찾기
    let startAngle = -Math.PI / 2;
    let winnerStartAngle = 0;
    let winnerEndAngle = 0;

    for (const p of participants) {
        const prob = probabilities[p.name] || 0;
        const sliceAngle = (prob / 100) * Math.PI * 2;

        if (p.name === winnerName) {
            winnerStartAngle = startAngle;
            winnerEndAngle = startAngle + sliceAngle;
            break;
        }
        startAngle += sliceAngle;
    }

    // 해당 파이 조각 내 랜덤 위치
    const angleRange = winnerEndAngle - winnerStartAngle;
    const randomAngle = winnerStartAngle + (0.2 + Math.random() * 0.6) * angleRange;
    const randomRadius = 30 + Math.random() * (maxRadius - 40);

    return {
        x: centerX + Math.cos(randomAngle) * randomRadius,
        y: centerY + Math.sin(randomAngle) * randomRadius
    };
}

// 다트 던지기 애니메이션 (정면에서 날아옴 - 포물선 궤적)
function throwDart(targetPosition) {
    return new Promise((resolve) => {
        const dart = flyingDart;
        const wrapper = document.querySelector('.dartboard-wrapper');
        const wrapperRect = wrapper.getBoundingClientRect();

        // 타겟 위치 (다트판 내 좌표를 화면 좌표로 변환)
        const targetOffsetX = ((targetPosition.x / 400) - 0.5) * wrapperRect.width;
        const targetOffsetY = ((targetPosition.y / 400) - 0.5) * wrapperRect.height;

        // 시작: 화면 중앙에서 작게, 끝: 타겟 위치에서 크게
        dart.style.left = '50%';
        dart.style.top = '50%';
        dart.classList.add('active');

        const duration = 500; // 약간 더 길게
        const startTime = Date.now();

        // 다트 날개 회전 효과
        let rotation = 0;

        // 포물선 효과를 위한 설정
        const arcHeight = -80; // 위로 올라가는 최대 높이 (음수 = 위로)
        const startY = 50; // 시작 시 아래에서 시작

        function animate() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // easeOutQuart - 처음 빠르고 끝에 감속
            const eased = 1 - Math.pow(1 - progress, 4);

            // 스케일: 0.1 -> 1 (멀리서 가까이 다가오는 효과)
            const scale = 0.1 + eased * 0.9;

            // X 위치: 중앙에서 타겟으로 이동
            const currentOffsetX = targetOffsetX * eased;

            // Y 위치: 포물선 궤적 (살짝 위로 갔다가 아래로)
            // 시작: 아래, 중간: 위로, 끝: 타겟
            const arcProgress = Math.sin(progress * Math.PI); // 0 -> 1 -> 0 곡선
            const baseY = startY * (1 - eased); // 시작점에서 0으로
            const arcY = arcHeight * arcProgress * (1 - progress * 0.5); // 포물선 효과 (끝으로 갈수록 감소)
            const currentOffsetY = targetOffsetY * eased + baseY + arcY;

            // 다트 날개 회전 (빠르게 회전하다가 멈춤)
            rotation += (1 - eased) * 25;

            // 다트 기울기 (위로 갈 때 위를 향하고, 아래로 내려올 때 아래를 향함)
            const tiltAngle = (progress < 0.4) ? -15 * (1 - progress * 2) : 10 * (progress - 0.4);

            dart.style.transform = `translate(calc(-50% + ${currentOffsetX}px), calc(-50% + ${currentOffsetY}px)) scale(${scale})`;
            dart.querySelector('.dart-body').style.transform = `rotate(${rotation}deg) rotateX(${tiltAngle}deg)`;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // 꽂히는 효과 (살짝 커졌다가 작아짐 + 흔들림)
                dart.style.transform = `translate(calc(-50% + ${targetOffsetX}px), calc(-50% + ${targetOffsetY}px)) scale(1.15)`;
                dart.querySelector('.dart-body').style.transform = `rotate(${rotation}deg) rotateX(5deg)`;

                setTimeout(() => {
                    dart.style.transform = `translate(calc(-50% + ${targetOffsetX}px), calc(-50% + ${targetOffsetY}px)) scale(0.95)`;
                    setTimeout(() => {
                        dart.style.transform = `translate(calc(-50% + ${targetOffsetX}px), calc(-50% + ${targetOffsetY}px)) scale(1)`;
                        setTimeout(() => {
                            dart.classList.remove('active');
                            resolve();
                        }, 80);
                    }, 60);
                }, 50);
            }
        }

        requestAnimationFrame(animate);
    });
}

// 꽂힌 다트 추가
function addStuckDart(position, winnerName, dartNumber) {
    const dart = document.createElement('div');
    dart.className = 'stuck-dart';
    dart.style.left = (position.x / 400 * 100) + '%';
    dart.style.top = (position.y / 400 * 100) + '%';

    dart.innerHTML = `
        <div class="dart-pin"></div>
        <div class="dart-label">${dartNumber}. ${escapeHtml(winnerName)}</div>
    `;

    stuckDarts.appendChild(dart);
}

// 라운드 표시
function showDartRound(current, total) {
    dartRound.textContent = `🎯 ${current} / ${total} 번째 다트`;
    dartRound.classList.add('active');
}

function hideDartRound() {
    dartRound.classList.remove('active');
}

// 당첨자 표시
function showDartWinner(winnerName, round) {
    return new Promise((resolve) => {
        dartWinnerDisplay.innerHTML = `
            <span class="winner-round">${round}번째 당첨!</span>
            <span class="winner-name-display">${escapeHtml(winnerName)}</span>
        `;
        dartWinnerDisplay.classList.add('active');

        setTimeout(() => {
            dartWinnerDisplay.classList.remove('active');
            resolve();
        }, 2000);
    });
}

// 단일 당첨자 추첨 (1명만)
function weightedDrawSingle(participants, probabilities) {
    let totalProb = 0;
    participants.forEach(p => {
        totalProb += probabilities[p.name] || 0;
    });

    let random = Math.random() * totalProb;

    for (const p of participants) {
        const prob = probabilities[p.name] || 0;
        random -= prob;
        if (random <= 0) {
            return p;
        }
    }

    return participants[participants.length - 1];
}

// 남은 참가자 기준 확률 재계산 (동일한 가중치 계수 사용)
function recalculateProbabilities(remainingParticipants, applyFortune = false) {
    const weights = {};
    let totalWeight = 0;

    // 동일한 가중치 계수 사용
    const weightFactor = getWeightFactor();
    remainingParticipants.forEach(p => {
        let weight = 1 / (1 + p.winCount * weightFactor);
        weights[p.name] = weight;
        totalWeight += weight;
    });

    const probabilities = {};
    remainingParticipants.forEach(p => {
        probabilities[p.name] = (weights[p.name] / totalWeight) * 100;
    });

    // 운세 모드 적용
    if (applyFortune && fortuneMode && todayLuckyPerson && probabilities[todayLuckyPerson] !== undefined) {
        const luckyReduction = 5;
        const othersCount = Object.keys(probabilities).length - 1;

        if (othersCount > 0) {
            const actualReduction = Math.min(luckyReduction, probabilities[todayLuckyPerson] - 1);
            probabilities[todayLuckyPerson] -= actualReduction;
            const bonus = actualReduction / othersCount;

            Object.keys(probabilities).forEach(name => {
                if (name !== todayLuckyPerson) {
                    probabilities[name] += bonus;
                }
            });
        }
    }

    return probabilities;
}

// 운세 애니메이션 표시
function showFortuneAnimation() {
    return new Promise((resolve) => {
        fortuneText.textContent = `🍀 ${todayLuckyPerson}님의 행운이 -5%!`;
        fortuneAnimation.classList.add('active');

        setTimeout(() => {
            fortuneAnimation.classList.remove('active');
            resolve();
        }, 2500);
    });
}

// 가중치 기반 추첨 (확률 전달받음)
function weightedDraw(participants, count, probabilities) {
    const winners = [];
    const remaining = [...participants];
    let remainingProbs = { ...probabilities };

    for (let i = 0; i < count; i++) {
        if (remaining.length === 0) break;

        // 남은 확률 재계산
        let totalProb = 0;
        remaining.forEach(p => {
            totalProb += remainingProbs[p.name] || 0;
        });

        let random = Math.random() * totalProb;
        let winner = null;

        for (const p of remaining) {
            const prob = remainingProbs[p.name] || 0;
            random -= prob;
            if (random <= 0) {
                winner = p;
                break;
            }
        }

        if (!winner) winner = remaining[remaining.length - 1];

        winners.push(winner);
        const idx = remaining.findIndex(p => p.name === winner.name);
        remaining.splice(idx, 1);
        delete remainingProbs[winner.name];
    }

    return winners;
}

// 딜레이 함수
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 당첨자 표시
function displayWinners(winners, exemptedParticipants = []) {
    let html = winners.map((w, i) => `
        <div class="winner-card" style="animation-delay: ${i * 0.2}s">
            🥇 ${escapeHtml(w.name)}
        </div>
    `).join('');

    if (exemptedParticipants.length > 0) {
        html += `<div class="exempted-info">🛡️ 면제: ${exemptedParticipants.map(p => escapeHtml(p.name)).join(', ')}</div>`;
    }

    winnersDisplay.innerHTML = html;
    slotMachine.innerHTML = '';

    setTimeout(() => showCelebration(winners), 500);
}

// 축하 효과 표시
function showCelebration(winners) {
    celebrationOverlay.classList.add('active');

    winnerAnnouncement.innerHTML = winners.map(w =>
        `<span class="winner-name">${escapeHtml(w.name)}</span>`
    ).join('');

    createConfetti();
}

// 컨페티 생성
function createConfetti() {
    confettiContainer.innerHTML = '';
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7', '#6366f1', '#22c55e', '#f59e0b'];

    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

        if (Math.random() > 0.5) {
            confetti.style.borderRadius = '50%';
        }

        confettiContainer.appendChild(confetti);
    }
}

// 축하 효과 닫기
function closeCelebration() {
    celebrationOverlay.classList.remove('active');
    confettiContainer.innerHTML = '';
}

// 당첨 기록 업데이트
function updateWinRecords(winners, exemptedParticipants = []) {
    exemptedParticipants.forEach(exempted => {
        const participant = participants.find(p => p.name === exempted.name);
        if (participant) {
            participant.hasExemption = false;
            participant.consecutiveWins = 0;
        }
    });

    winners.forEach(winner => {
        const participant = participants.find(p => p.name === winner.name);
        if (participant) {
            participant.winCount++;
            participant.consecutiveWins++;

            if (participant.consecutiveWins >= 3 && !participant.hasExemption) {
                participant.hasExemption = true;
                setTimeout(() => {
                    alert(`🛡️ ${participant.name}님이 3연속 당첨으로 면제권을 획득했습니다!`);
                }, 100);
            }
        }
    });

    const winnerNames = winners.map(w => w.name);
    const exemptedNames = exemptedParticipants.map(e => e.name);
    participants.forEach(p => {
        if (!winnerNames.includes(p.name) && !exemptedNames.includes(p.name)) {
            if (selectedParticipants.has(p.name)) {
                p.consecutiveWins = 0;
            }
        }
    });

    saveData();
    renderParticipants();
}

// 이력 저장
function saveHistory(winners, exemptedParticipants = []) {
    const record = {
        id: Date.now(),
        date: new Date().toLocaleString('ko-KR'),
        winners: winners.map(w => w.name),
        exempted: exemptedParticipants.map(e => e.name)
    };

    history.unshift(record);
    localStorage.setItem('lotteryHistory', JSON.stringify(history));
    renderHistory();
}

// 이력 렌더링
function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-message">당첨 이력이 없습니다</div>';
        return;
    }

    historyList.innerHTML = history.map(record => {
        const exemptedHtml = record.exempted && record.exempted.length > 0
            ? record.exempted.map(e => `<span class="history-exempted-tag">🛡️ ${escapeHtml(e)}</span>`).join('')
            : '';

        return `
            <div class="history-item">
                <span class="history-date">${escapeHtml(record.date)}</span>
                <div class="history-winners">
                    ${record.winners.map(w => `<span class="history-winner-tag">🏆 ${escapeHtml(w)}</span>`).join('')}
                    ${exemptedHtml}
                </div>
                <button class="history-delete" onclick="deleteHistory(${record.id})">✕</button>
            </div>
        `;
    }).join('');
}

// 통계 렌더링
function renderStats() {
    if (participants.length === 0) {
        statsSummary.innerHTML = '<div class="empty-message">참가자가 없습니다</div>';
        drawEmptyChart();
        return;
    }

    const totalWins = participants.reduce((sum, p) => sum + p.winCount, 0);
    const maxWins = Math.max(...participants.map(p => p.winCount), 1);

    // 당첨 순으로 정렬
    const sorted = [...participants].sort((a, b) => b.winCount - a.winCount);

    // 요약 바 차트
    statsSummary.innerHTML = sorted.slice(0, 5).map((p, i) => {
        const percentage = totalWins > 0 ? (p.winCount / totalWins * 100).toFixed(1) : 0;
        const barWidth = (p.winCount / maxWins * 100);
        const color = rouletteColors[i % rouletteColors.length];

        return `
            <div class="stat-item">
                <span class="stat-name">
                    <span style="color: ${color}">●</span>
                    ${escapeHtml(p.name)}
                </span>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${barWidth}%; background: ${color}"></div>
                </div>
                <span class="stat-value">${p.winCount}회 (${percentage}%)</span>
            </div>
        `;
    }).join('');

    if (sorted.length > 5) {
        statsSummary.innerHTML += `<div class="empty-message" style="padding: 10px;">외 ${sorted.length - 5}명...</div>`;
    }

    // 파이 차트 그리기
    drawPieChart(sorted, totalWins);
}

// 빈 차트 그리기
function drawEmptyChart() {
    const ctx = statsChart.getContext('2d');
    const parentWidth = statsChart.parentElement ? statsChart.parentElement.clientWidth : 220;
    const size = Math.min(parentWidth - 30, 220);
    statsChart.width = size;
    statsChart.height = size;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('데이터 없음', size/2, size/2);
}

// 파이 차트 그리기
function drawPieChart(sortedParticipants, totalWins) {
    const ctx = statsChart.getContext('2d');
    const parentWidth = statsChart.parentElement ? statsChart.parentElement.clientWidth : 220;
    const size = Math.min(parentWidth - 30, 220);
    statsChart.width = size;
    statsChart.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 10;

    if (totalWins === 0) {
        drawEmptyChart();
        return;
    }

    let startAngle = -Math.PI / 2;

    sortedParticipants.forEach((p, i) => {
        if (p.winCount === 0) return;

        const sliceAngle = (p.winCount / totalWins) * 2 * Math.PI;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();

        ctx.fillStyle = rouletteColors[i % rouletteColors.length];
        ctx.fill();

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.stroke();

        startAngle += sliceAngle;
    });

    // 중앙 원
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${totalWins}회`, centerX, centerY);
}

// 이력 삭제
function deleteHistory(id) {
    if (!confirm('이 당첨 기록을 삭제하시겠습니까?\n(당첨 횟수만 감소되며, 연속 당첨/면제권은 유지됩니다)')) return;

    const record = history.find(h => h.id === id);
    if (record) {
        record.winners.forEach(winnerName => {
            const participant = participants.find(p => p.name === winnerName);
            if (participant && participant.winCount > 0) {
                participant.winCount--;
            }
        });
    }

    history = history.filter(h => h.id !== id);
    localStorage.setItem('lotteryHistory', JSON.stringify(history));
    saveData();
    renderHistory();
    renderParticipants();
    renderStats();
}

// 전체 이력 삭제
function clearHistory() {
    if (!confirm('모든 당첨 이력을 삭제하시겠습니까?\n참가자들의 당첨 횟수, 연속 당첨, 면제권도 초기화됩니다.')) return;

    history = [];
    participants.forEach(p => {
        p.winCount = 0;
        p.consecutiveWins = 0;
        p.hasExemption = false;
    });
    localStorage.setItem('lotteryHistory', JSON.stringify(history));
    saveData();
    renderHistory();
    renderParticipants();
    renderStats();
}

// 데이터 저장
function saveData() {
    localStorage.setItem('participants', JSON.stringify(participants));
    localStorage.setItem('selectedParticipants', JSON.stringify([...selectedParticipants]));
}
