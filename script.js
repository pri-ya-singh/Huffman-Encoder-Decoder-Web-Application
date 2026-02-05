// =======================
// Huffman Tree Node
// =======================
class Node {
  constructor(char, freq, left = null, right = null) {
    this.char = char;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

// =======================
// Build frequency map
// =======================
function buildFrequencyMap(text) {
  const freqMap = new Map();
  for (const char of text) {
    freqMap.set(char, (freqMap.get(char) || 0) + 1);
  }
  return freqMap;
}

// =======================
// Build Huffman Tree
// =======================
function buildHuffmanTree(freqMap) {
  const pq = [];

  for (const [char, freq] of freqMap) {
    pq.push(new Node(char, freq));
  }

  if (pq.length === 1) {
    return new Node(null, pq[0].freq, pq[0], null);
  }

  pq.sort((a, b) => a.freq - b.freq);

  while (pq.length > 1) {
    const left = pq.shift();
    const right = pq.shift();
    pq.push(new Node(null, left.freq + right.freq, left, right));
    pq.sort((a, b) => a.freq - b.freq);
  }
  return pq[0];
}

// =======================
// Generate Huffman Codes
// =======================
function generateCodes(node, prefix = "", codes = new Map()) {
  if (!node) return;

  if (node.char !== null) {
    codes.set(node.char, prefix || "0");
  } else {
    generateCodes(node.left, prefix + "0", codes);
    generateCodes(node.right, prefix + "1", codes);
  }
  return codes;
}

// =======================
// Encode / Decode
// =======================
function encodeText(text, codes) {
  return [...text].map(c => codes.get(c)).join("");
}

function decodeText(bits, root, bitLength) {
  let decoded = "";
  let node = root;

  for (let i = 0; i < bitLength; i++) {
    node = bits[i] === "0" ? node.left : node.right;
    if (node.char !== null) {
      decoded += node.char;
      node = root;
    }
  }
  return decoded;
}

// =======================
// Display Codes Table
// =======================
function displayCodes(freqMap, codes) {
  const tbody = document.querySelector("#codesTable tbody");
  tbody.innerHTML = "";

  for (const [char, code] of codes) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${char === " " ? "(space)" : char}</td>
      <td>${freqMap.get(char)}</td>
      <td>${code}</td>
    `;
    tbody.appendChild(row);
  }
}

// =======================
// 🌳 CANVAS VISUALIZATION
// =======================
const canvas = document.getElementById("treeCanvas");
const ctx = canvas.getContext("2d");
ctx.font = "12px Arial";
ctx.textAlign = "center";

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawNode(x, y, text) {
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#4f46e5";
  ctx.fill();
  ctx.strokeStyle = "#1e1b4b";
  ctx.stroke();

  ctx.fillStyle = "white";
  ctx.fillText(text, x, y + 4);
}

function drawLine(x1, y1, x2, y2, label) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = "#333";
  ctx.stroke();

  ctx.fillStyle = "red";
  ctx.fillText(label, (x1 + x2) / 2, (y1 + y2) / 2);
}

function drawTree(node, x, y, gap) {
  if (!node) return;

  const text = node.char ? `${node.char}:${node.freq}` : node.freq;
  drawNode(x, y, text);

  if (node.left) {
    drawLine(x, y + 20, x - gap, y + 80, "0");
    drawTree(node.left, x - gap, y + 80, gap / 2);
  }

  if (node.right) {
    drawLine(x, y + 20, x + gap, y + 80, "1");
    drawTree(node.right, x + gap, y + 80, gap / 2);
  }
}

// =======================
// ENCODE HANDLER
// =======================
document.getElementById("encodeBtn").addEventListener("click", () => {
  const input = document.getElementById("encodeFileInput");
  const file = input.files[0];
  if (!file) return alert("Select a text file.");

  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    if (!text.length) return alert("File is empty!");

    const freqMap = buildFrequencyMap(text);
    const root = buildHuffmanTree(freqMap);
    const codes = generateCodes(root);
    const encoded = encodeText(text, codes);

    displayCodes(freqMap, codes);

    // 🌳 Draw Huffman Tree
    clearCanvas();
    drawTree(root, canvas.width / 2, 40, 220);

    const freqObj = Object.fromEntries(freqMap);
    const freqBytes = new TextEncoder().encode(JSON.stringify(freqObj));

    const bitLength = encoded.length;
    const byteArray = new Uint8Array(Math.ceil(bitLength / 8));
    for (let i = 0; i < bitLength; i += 8) {
      byteArray[i / 8] = parseInt(encoded.slice(i, i + 8).padEnd(8, "0"), 2);
    }

    const buffer = new Uint8Array(8 + freqBytes.length + byteArray.length);
    new DataView(buffer.buffer).setUint32(0, freqBytes.length);
    new DataView(buffer.buffer).setUint32(4, bitLength);

    buffer.set(freqBytes, 8);
    buffer.set(byteArray, 8 + freqBytes.length);

    const blob = new Blob([buffer]);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name.replace(".txt", ".huf");
    a.click();

    // 📊 Stats
    document.getElementById("originalSize").innerText = text.length;
    document.getElementById("compressedSize").innerText = buffer.length;
    document.getElementById("compressionPercent").innerText =
      ((1 - buffer.length / text.length) * 100).toFixed(2);

    // 🔄 AUTO RESET
    // input.value = "";
  };
  reader.readAsText(file);
});

// =======================
// DECODE HANDLER
// =======================
document.getElementById("decodeBtn").addEventListener("click", () => {
  const input = document.getElementById("decodeFileInput");
  const file = input.files[0];
  if (!file) return alert("Select a .huf file.");

  const reader = new FileReader();
  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const view = new DataView(data.buffer);

    const freqLen = view.getUint32(0);
    const bitLen = view.getUint32(4);

    const freqMap = new Map(
      Object.entries(
        JSON.parse(new TextDecoder().decode(data.slice(8, 8 + freqLen)))
      )
    );

    const root = buildHuffmanTree(freqMap);

    let bits = "";
    for (const b of data.slice(8 + freqLen)) {
      bits += b.toString(2).padStart(8, "0");
    }

    const decoded = decodeText(bits, root, bitLen);

    const blob = new Blob([decoded], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name.replace(".huf", ".txt");
    a.click();

    // 🔄 AUTO RESET
    // input.value = "";
  };
  reader.readAsArrayBuffer(file);
}); 