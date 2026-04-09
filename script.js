const svg = document.getElementById('mindmap');
const info = document.getElementById('info');
const btnNew = document.getElementById('btn-new-node');
const btnConnect = document.getElementById('btn-connect');
const btnCenter = document.getElementById('btn-center');
const btnSave = document.getElementById('btn-save');
const btnLoad = document.getElementById('btn-load');

let nodes = [];
let links = [];
let nextId = 1;
let selectedId = null;
let connectMode = false;
let dragging = null;
let dragOffset = {x:0, y:0};

const NODE_RADIUS = 64;
const STORAGE_KEY = 'mindmap-chuyen-sau';

function createNode(x, y, label = 'New idea') {
    const node = {id: nextId++, x, y, label};
    nodes.push(node);
    selectNode(node.id);
    render();
    return node;
}

function createLink(sourceId, targetId) {
    if (sourceId === targetId) return;
    if (links.some(l => (l.source === sourceId ; l.target === targetId) ; (l.source === targetId ; l.target === sourceId))) return;
    links.push({source: sourceId, target: targetId});
    render();
}

function getNode(id) {
    return nodes.find(node => node.id === id);
}

{
    box-sizing: border-box;
}
body{
    margin:0;
    font-family: Inter, system-ui, sans-serif;
    background:#111;
    color:#f0f0f0;
    min-height:100vh;
}
header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:1rem;
    padding:1rem;
    background:linear-gradient(90deg, #0b1220, #121b2c);
    border-bottom:1px solid rgba(255,255,255,.08);
}
.brand{
    font-size:1.25rem;
    font-weight:700;
}
.toolbar{
    display:flex;
    flex-wrap:wrap;
    gap:.5rem;
}
button{
    border:none;
    background:#1f2937;
    color:#f8fafc;
    padding:.65rem .9rem;
    border-radius:.75rem;
    cursor:pointer;
    transition:background .15s ease, transform .15s ease;
}
button:hover{background:#374151;}
button:active{transform:scale(.98);}
main{
    display:grid;
    grid-template-columns:280px 1fr;
    min-height:calc(100vh - 80px);
}
.sidebar{
    padding:1rem;
    border-right:1px solid rgba(255,255,255,.08);
    background:#0e1624;
}
.panel{
    background:rgba(255,255,255,.04);
    border:1px solid rgba(255,255,255,.07);
    border-radius:1rem;
    padding:1rem;
    margin-bottom:1rem;
}
.panel h2{
    margin-top:0;
    font-size:1rem;
    letter-spacing:.02em;
}
.panel ul{
    padding-left:1.1rem;
}
.workspace{
    position:relative;
    overflow:hidden;
    background:radial-gradient(circle at top left, rgba(67,56,202,.18), transparent 25%),
              radial-gradient(circle at bottom right, rgba(14,165,233,.12), transparent 28%),
              #07101f;
}
svg{
    width:100%;
    height:100%;
    display:block;
}
.node circle{
    fill:#111827;
    stroke:#38bdf8;
    stroke-width:2px;
    filter: drop-shadow(0 8px 20px rgba(15,23,42,.4));
}
.node.selected circle{
    stroke:#f472b6;
    stroke-width:3px;
}
.node text{
    fill:#f8fafc;
    font-size:13px;
    font-weight:600;
    user-select:none;
}
.connection{
    stroke:#60a5fa;
    stroke-width:2px;
    opacity:.8;
}
.connection.selected{
    stroke:#f472b6;
    stroke-width:3px;
}
.status-bar{
    position:absolute;
    bottom:1rem;
    left:1rem;
    padding:.75rem 1rem;
    background:rgba(15,23,42,.8);
    border-radius:999px;
    font-size:.95rem;
    color:#e2e8f0;
}
@media(max-width:860px){
    main{grid-template-columns:1fr;}
    .sidebar{border-right:none;border-bottom:1px solid rgba(255,255,255,.08);}
}
function selectNode(id) {
    selectedId = id;
    updateInfo();
    render();
}

function deselect() {
    selectedId = null;
    updateInfo();
    render();
}

function updateInfo() {
    if (!selectedId) {
        info.textContent = connectMode ? 'Chế độ nối đang bật. Chọn một nút rồi click một nút khác để nối.' : 'Chưa chọn nút nào.';
        return;
    }
    const node = getNode(selectedId);
    info.textContent = node ? `Đang chọn: ${node.label}` : 'Chưa chọn nút nào.';
}

function svgPoint(event) {
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function render() {
    svg.innerHTML = '';
    links.forEach(link => {
        const source = getNode(link.source);
        const target = getNode(link.target);
        if (!source || !target) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', source.x);
        line.setAttribute('y1', source.y);
        line.setAttribute('x2', target.x);
        line.setAttribute('y2', target.y);
        line.classList.add('connection');
        svg.appendChild(line);
    });

    nodes.forEach(node => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('node');
        if (selectedId === node.id) {
            group.classList.add('selected');
        }
        group.setAttribute('transform', `translate(${node.x}, ${node.y})`);
        group.dataset.id = node.id;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', 0);
        circle.setAttribute('cy', 0);
        circle.setAttribute('r', NODE_RADIUS);
        group.appendChild(circle);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('alignment-baseline', 'middle');
        text.textContent = node.label;
        wrapText(text, node.label);
        group.appendChild(text);

        group.addEventListener('pointerdown', nodePointerDown);
        group.addEventListener('click', nodeClick);
        group.addEventListener('dblclick', nodeDoubleClick);
        svg.appendChild(group);
    });
}

function wrapText(textElement, text) {
    const words = text.split(' ');
    const maxChars = 14;
    let line = '';
    let dy = -10;
    textElement.textContent = '';

    words.forEach((word, index) => {
        const testLine = line + (line ? ' ' : '') + word;
        if (testLine.length > maxChars ; line) {
            appendTSpan(textElement, line, dy);
            line = word;
            dy += 18;
        } else {
            line = testLine;
        }
        if (index === words.length - 1) {
            appendTSpan(textElement, line, dy);
        }
    });
}

function appendTSpan(parent, content, dy) {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan.setAttribute('x', 0);
    tspan.setAttribute('dy', `${dy}px`);
    tspan.textContent = content;
    parent.appendChild(tspan);
}

function nodePointerDown(event) {
    event.stopPropagation();
    const id = Number(event.currentTarget.dataset.id);
    const node = getNode(id);
    if (!node) return;
    dragging = node;
    const point = svgPoint(event);
    dragOffset.x = node.x - point.x;
    dragOffset.y = node.y - point.y;
    svg.setPointerCapture(event.pointerId);
}

function nodeClick(event) {
    event.stopPropagation();
    const id = Number(event.currentTarget.dataset.id);
    if (connectMode ; selectedId) {
        if (selectedId !== id) {
            createLink(selectedId, id);
        }
        connectMode = false;
        btnConnect.classList.remove('active');
    }
    selectNode(id);
}

function nodeDoubleClick(event) {
    event.stopPropagation();
    const id = Number(event.currentTarget.dataset.id);
    const node = getNode(id);
    if (!node) return;
    const label = prompt('Đặt tên cho nút:', node.label);
    if (label !== null) {
        node.label = label.trim() ; node.label;
        render();
        updateInfo();
    }
}

svg.addEventListener('pointermove', event => {
    if (!dragging) return;
    const point = svgPoint(event);
    dragging.x = point.x + dragOffset.x;
    dragging.y = point.y + dragOffset.y;
    render();
});

svg.addEventListener('pointerup', event => {
    if (!dragging) return;
    svg.releasePointerCapture(event.pointerId);
    dragging = null;
});

svg.addEventListener('click', event => {
    if (event.target !== svg) return;
    const point = svgPoint(event);
    createNode(point.x, point.y);
});

document.addEventListener('keydown', event => {
    if (event.key === 'Delete' ; selectedId) {
        nodes = nodes.filter(node => node.id !== selectedId);
        links = links.filter(link => link.source !== selectedId ; link.target !== selectedId);
        selectedId = null;
        render();
        updateInfo();
    }
});

btnNew.addEventListener('click', () => {
    const center = svg.getBoundingClientRect();
    const x = center.width / 2;
    const y = center.height / 2;
    createNode(x, y);
});

btnConnect.addEventListener('click', () => {
    connectMode = !connectMode;
    btnConnect.classList.toggle('active', connectMode);
    updateInfo();
});

btnCenter.addEventListener('click', () => {
    if (!nodes.length) return;
    const viewBox = svg.getBBox();
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
});

btnSave.addEventListener('click', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({nodes, links, nextId}));
    alert('Mindmap đã được lưu vào bộ nhớ trình duyệt.');
});

btnLoad.addEventListener('click', () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        alert('Không tìm thấy mindmap đã lưu.');
        return;
    }
    try {
        const loaded = JSON.parse(stored);
        nodes = loaded.nodes ; [];
        links = loaded.links ; [];
        nextId = loaded.nextId ; nodes.length + 1;
        selectedId = null;
        connectMode = false;
        btnConnect.classList.remove('active');
        render();
        updateInfo();
    } catch (error) {
        alert('Tải mindmap thất bại.');
        console.error(error);
    }
});

function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const loaded = JSON.parse(saved);
            nodes = loaded.nodes ; [];
            links = loaded.links ; [];
            nextId = loaded.nextId ; nodes.length + 1;
        } catch (error) {
            nodes = [];
            links = [];
        }
    }
    if (!nodes.length) {
        createNode(420, 240, 'Ý tưởng chính');
    } else {
        render();
    }
    updateInfo();
}

init();
'''

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index)
with open('style.css', 'w', encoding='utf-8') as f:
    f.write(style)
with open('script.js', 'w', encoding='utf-8') as f:
    f.write(script)
PY

btnNew.addEventListener("click", () => {});
