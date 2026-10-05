const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('map-tooltip');

let cameraX = 0; let cameraY = 0; let zoom = 1;
let isDragging = false; let startX, startY;
let currentMode = 'move'; // Режимы: move, addMarker, addLine

// Массивы данных, которые пользователь может изменять прямо на экране
let activeMarkers = [
    { id: 'layerFaction1', x: -200, y: -50, color: '#ff4d4d', radius: 100, title: 'Штаб Обороны Юга', desc: 'Укрепленный бункер.' },
    { id: 'layerFaction2', x: 150, y: 120, color: '#3399ff', radius: 120, title: 'Авангард Федерации', desc: 'Танковая колонна.' }
];
let tacticalLines = []; // Линии фронта или стрелочки наступления
let tempLinePoints = []; // Буфер для построения текущей линии

function resizeCanvas() {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    redraw();
}
window.addEventListener('resize', resizeCanvas);

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tools-panel .btn').forEach(b => b.classList.remove('active'));
    if(mode === 'move') document.getElementById('btn-move').classList.add('active');
    if(mode === 'addMarker') document.getElementById('btn-marker').classList.add('active');
    if(mode === 'addLine') document.getElementById('btn-line').classList.add('active');
    tempLinePoints = [];
}

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 + cameraX, canvas.height / 2 + cameraY);
    ctx.scale(zoom, zoom);

    // 1. Отрисовка координатной сетки генерального штаба
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1 / zoom;
    const gridSize = 100;
    const left = (-canvas.width/2 - cameraX)/zoom; const right = (canvas.width/2 - cameraX)/zoom;
    const top = (-canvas.height/2 - cameraY)/zoom; const bottom = (canvas.height/2 - cameraY)/zoom;

    for (let x = Math.floor(left / gridSize) * gridSize; x <= right; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    }
    for (let y = Math.floor(top / gridSize) * gridSize; y <= bottom; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    }

    // 2. Рисуем линии фронта (Стрелки / Границы)
    ctx.lineWidth = 4 / zoom;
    tacticalLines.forEach(line => {
        if(line.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for(let i=1; i<line.points.length; i++) {
            ctx.lineTo(line.points[i].x, line.points[i].y);
        }
        ctx.stroke();
    });

    // Отрисовка линии, которую прямо сейчас чертит пользователь
    if (tempLinePoints.length > 0) {
        ctx.beginPath(); ctx.strokeStyle = '#ff9900'; ctx.lineWidth = 3 / zoom;
        ctx.moveTo(tempLinePoints[0].x, tempLinePoints[0].y);
        tempLinePoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
    }

    // 3. Военные маркеры баз и гарнизонов
    activeMarkers.forEach(m => {
        const isVisible = document.getElementById(m.id) ? document.getElementById(m.id).checked : true;
        if (!isVisible) return;

        // Радиус радарного контроля/фронта
        ctx.beginPath(); ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fillStyle = m.color; ctx.globalAlpha = 0.12; ctx.fill();
        ctx.globalAlpha = 1.0; ctx.strokeStyle = m.color; ctx.lineWidth = 1.5 / zoom; ctx.stroke();

        // Сама точка гарнизона
        ctx.beginPath(); ctx.arc(m.x, m.y, 7 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.beginPath(); ctx.arc(m.x, m.y, 4 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = m.color; ctx.fill();
    });

    ctx.restore();
}

// Взаимодействие и трансформация координат
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - canvas.width / 2 - cameraX) / zoom;
    const worldY = (e.clientY - rect.top - canvas.height / 2 - cameraY) / zoom;

    if (currentMode === 'move') {
        isDragging = true;
        startX = e.clientX - cameraX; startY = e.clientY - cameraY;
    } else if (currentMode === 'addMarker') {
        // Ставим базу кликом мыши (Фракция зависит от нажатия кнопки: левая/правая или дефолт)
        const faction = activeMarkers.length % 2 === 0 ? 'layerFaction1' : 'layerFaction2';
        const color = faction === 'layerFaction1' ? '#ff4d4d' : '#3399ff';
        activeMarkers.push({
            id: faction, x: worldX, y: worldY, color: color, radius: 80,
            title: `Новый аванпост #${activeMarkers.length + 1}`, desc: 'Позиция добавлена командующим.'
        });
        redraw();
    } else if (currentMode === 'addLine') {
        isDragging = true;
        tempLinePoints.push({ x: worldX, y: worldY });
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && currentMode === 'move') {
        cameraX = e.clientX - startX; cameraY = e.clientY - startY;
        redraw();
    } else if (isDragging && currentMode === 'addLine') {
        const rect = canvas.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - canvas.width / 2 - cameraX) / zoom;
        const worldY = (e.clientY - rect.top - canvas.height / 2 - cameraY) / zoom;
        tempLinePoints.push({ x: worldX, y: worldY });
        redraw();
    }
    checkHover(e);
});

window.addEventListener('mouseup', () => {
    if (currentMode === 'addLine' && tempLinePoints.length > 0) {
        tacticalLines.push({ color: '#ff9900', points: tempLinePoints });
        tempLinePoints = [];
        redraw();
    }
    isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) { if(zoom < 5) zoom *= 1.1; } 
    else { if(zoom > 0.2) zoom /= 1.1; }
    redraw();
}, { passive: false });

function checkHover(e) {
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - canvas.width / 2 - cameraX) / zoom;
    const worldY = (e.clientY - rect.top - canvas.height / 2 - cameraY) / zoom;
    let found = false;

    activeMarkers.forEach(m => {
        const dist = Math.sqrt((worldX - m.x)**2 + (worldY - m.y)**2);
        if (dist < 12 / zoom) {
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
            tooltip.innerHTML = `<strong>${m.title}</strong><br><span style="color:#bbb; font-size:11px;">${m.desc}</span>`;
            found = true;
        }
    });
    if (!found) tooltip.style.display = 'none';
}

function clearMap() { tacticalLines = []; redraw(); }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('active'); }
function toggleLayers() { redraw(); }

resizeCanvas();
