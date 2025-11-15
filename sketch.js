// =================================================================
// 1. 全域變數定義
// =================================================================

let circles = [];          // 背景氣球陣列
let poppingBalloons = []; // 可點擊的主要氣球陣列
let colors = ['#0081a7', '#00afb9', '#f0e6ef', '#fed9b7', '#f07167']; // 顏色列表
let explosionSound;       // 爆破音效

// 遊戲狀態與分數
let gameState = 'LOADING'; // 狀態: 'LOADING', 'COUNTDOWN', 'PLAYING', 'GAME_OVER'
let timeLeft = 10;        // 倒數計時 (秒)
let score = 0;          // 戳破的氣球數量
let lastTimeUpdate = 0;   // 上次計時更新的時間點
let audioReady = false;   // 追蹤音效是否已啟用


// =================================================================
// 2. 輔助函數：建立氣球物件
// =================================================================

/**
 * 建立一個新的氣球物件，用於主要的可點擊氣球
 * @returns {object} 新的氣球物件
 */
function createExplosionBalloon() {
    let r = random(30, 120);
    let alpha = random(150, 255);
    let baseColor = color(random(colors));
    baseColor.setAlpha(alpha);
    let speed = map(r, 30, 120, 2.5, 0.5);
    let boxSize = r * random(0.15, 0.22);
    let boxOffset = r * 0.22;
    
    let startY = height + r;  // 氣球從屏幕下方開始

    return {
        x: random(width),
        y: startY, 
        r: r,
        col: baseColor,
        speed: speed,
        boxSize: boxSize,
        boxOffset: boxOffset,
        exploding: false,
        baseR: r,
        timer: 0,
    };
}


// =================================================================
// 3. p5.js 核心函數 (preload, setup, draw, mousePressed)
// =================================================================

function preload() {
    // 預載入音效檔案。請確保 'soft-balloon-pop-88692.mp3' 檔案存在。
    explosionSound = loadSound('soft-balloon-pop-88692.mp3'); 
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    resetGameElements(); // 初始化所有氣球和計時
    noLoop(); // 暫停直到使用者點擊
}

function draw() {
    // 根據遊戲狀態繪製不同畫面
    switch (gameState) {
        case 'LOADING':
            drawLoadingScreen();
            break;
        case 'GAME_OVER':
            drawGameOverScreen();
            break;
        case 'COUNTDOWN': 
        case 'PLAYING':
            updateAndDrawGame();
            break;
    }
}

/** 處理滑鼠點擊 */
function mousePressed() {
    // 1. 遊戲結束：點擊重新開始
    if (gameState === 'GAME_OVER') {
        resetGameElements();
        gameState = 'LOADING'; 
        loop(); 
        return;
    }

    // 2. 遊戲載入中：第一次點擊，啟用音效並開始計時
    if (gameState === 'LOADING' && !audioReady) {
        userStartAudio().then(() => {
            audioReady = true;
            gameState = 'COUNTDOWN';
            lastTimeUpdate = millis();
            loop(); 
        }).catch(err => {
            console.error("Audio unlock failed:", err);
            audioReady = true; 
            gameState = 'COUNTDOWN';
            lastTimeUpdate = millis();
            loop();
        });
        return;
    }
    
    // 3. 遊戲進行中：偵測滑鼠點擊是否命中泡泡
    if (gameState === 'COUNTDOWN' || gameState === 'PLAYING') {
        
        if (gameState === 'COUNTDOWN') {
            gameState = 'PLAYING';
        }
        
        for (let i = 0; i < poppingBalloons.length; i++) {
            let balloon = poppingBalloons[i];
            
            // 只有未爆破的氣球才能被點擊
            if (!balloon.exploding) {
                
                // === 圓形碰撞判定 (改進版) ===
                let distance = dist(mouseX, mouseY, balloon.x, balloon.y);
                let hitRadius = balloon.r / 2 + 5;  // ✓ 稍微增加判定範圍，更容易點到
                
                // 只有氣球在螢幕內且距離符合時才計算命中
                if (balloon.y > -balloon.r && balloon.y < height + balloon.r) {
                    if (distance < hitRadius) {
                        // === 命中！設置爆炸 ===
                        balloon.exploding = true;
                        balloon.baseR = balloon.r;
                        balloon.timer = 0;
                        
                        // 播放音效
                        if (explosionSound && explosionSound.isLoaded() && audioReady) {
                            explosionSound.play();
                        }
                        
                        break;
                    }
                }
            }
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (gameState === 'LOADING' || gameState === 'GAME_OVER') {
        redraw();
    }
}


// =================================================================
// 4. 遊戲邏輯與繪製函數
// =================================================================

/** 重設所有遊戲元素到初始狀態 */
function resetGameElements() {
    score = 0;
    timeLeft = 10;
    
    // 重新產生背景氣球 (省略細節)
    circles = [];
    for (let i = 0; i < 90; i++) {
        let r = random(30, 120);
        let baseColor = color(random(colors));
        baseColor.setAlpha(random(50, 255));
        let speed = map(r, 30, 120, 2.5, 0.5);
        circles.push({
            x: random(width), y: random(height), r: r, col: baseColor, speed: speed, 
            boxSize: r * random(0.15, 0.22), boxOffset: r * 0.22
        });
    }

    // 重新產生主要爆破氣球 (確保分散在畫面外)
    poppingBalloons = [];
    const numPoppingBalloons = 5; 
    for (let i = 0; i < numPoppingBalloons; i++) {
        let newBalloon = createExplosionBalloon();
        // 設置不同的起始 Y 座標，讓它們錯開上升 (修復：減少間距)
        newBalloon.y = height + 100 + i * 80;  // ✓ 改為更合理的起始位置
        poppingBalloons.push(newBalloon);
    }
}

/** 繪製遊戲起始/載入畫面 */
function drawLoadingScreen() {
    background('#282c34'); 
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(36);
    text("點擊螢幕開始泡泡遊戲！", width / 2, height / 2);
    textSize(18);
    text("（您的點擊將啟用音效）", width / 2, height / 2 + 50);
}

/** 繪製遊戲結束畫面 (包含重新開始提示) */
function drawGameOverScreen() {
    background('#380e20');
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(64);
    text("時間到！", width / 2, height / 2 - 50);
    textSize(48);
    text(`總分: ${score}`, width / 2, height / 2 + 30); // 顯示分數
    textSize(24);
    text("點擊重新開始遊戲", width / 2, height / 2 + 100); // 重新開始提示
}

/** 更新並繪製遊戲進行中的所有元素 */
function updateAndDrawGame() {
    background('#e2f6f7ff');
    noStroke();

    // 遊戲計時更新
    let currentTime = millis();
    if (currentTime - lastTimeUpdate > 1000) {
        timeLeft--;
        lastTimeUpdate = currentTime;
    }
    // 時間到，切換狀態
    if (timeLeft <= 0) {
        gameState = 'GAME_OVER';
    }

    // 繪製遊戲資訊 (分數和時間)
    drawGameInfo();

    // 繪製並移動背景氣球
    updateAndDrawBackgroundCircles();

    // 繪製並移動主要氣球 (處理爆炸動畫)
    updateAndDrawPoppingBalloons();
}

/** 繪製分數和時間資訊 */
function drawGameInfo() {
    // 左上角 ID
    fill(50); 
    textAlign(LEFT, TOP); 
    textSize(15); 
    text("414730571", 10, 10); 

    // 右上角分數/時間
    fill(30);
    textAlign(RIGHT, TOP);
    textSize(22);
    text(`分數: ${score}`, width - 10, 10); 
    textSize(18);
    text(`時間: ${max(0, timeLeft)}s`, width - 10, 40);
}

/** 更新並繪製背景氣球 */
function updateAndDrawBackgroundCircles() {
    for (let i = 0; i < circles.length; i++) {
        let c = circles[i];
        fill(c.col);
        ellipse(c.x, c.y, c.r, c.r);

        let boxX = c.x + c.boxOffset;
        let boxY = c.y - c.boxOffset;
        fill(255, 255, 255, 120);
        rect(boxX, boxY, c.boxSize, c.boxSize, 4);

        c.y -= c.speed;
        if (c.y + c.r / 2 < 0) {
            c.y = height + c.r / 2;
        }
    }
}


/** 更新並繪製主要氣球，處理爆炸動畫和重置 */
function updateAndDrawPoppingBalloons() {
    let isGameActive = (gameState === 'COUNTDOWN' || gameState === 'PLAYING');

    for (let i = 0; i < poppingBalloons.length; i++) {
        let balloon = poppingBalloons[i];

        if (!balloon.exploding) {
            // 正常繪製
            if (isGameActive) {
                fill(balloon.col);
                ellipse(balloon.x, balloon.y, balloon.r, balloon.r);
                // 繪製高光
                fill(255, 255, 255, 120);
                rect(balloon.x + balloon.boxOffset, balloon.y - balloon.boxOffset, balloon.boxSize, balloon.boxSize, 4);
            }

            // 氣球上升 (只有未爆炸時才移動)
            balloon.y -= balloon.speed; 
            
            // 飄出頂部時重置
            if (balloon.y + balloon.r / 2 < 0) {
                poppingBalloons[i] = createExplosionBalloon();
            }

        } else {
            // 爆破動畫
            let t = balloon.timer;
            let maxT = 16;
            
            // 繪製爆炸波紋
            let currR = balloon.baseR + t * 18;
            let currAlpha = map(t, 0, maxT, alpha(balloon.col), 0);
            for (let j = 0; j < 3; j++) {
                let ringR = currR * (1 + j * 0.4);
                let ringAlpha = currAlpha * (0.5 - j * 0.15);
                noFill();
                stroke(red(balloon.col), green(balloon.col), blue(balloon.col), ringAlpha);
                strokeWeight(8 - j * 2);
                ellipse(balloon.x, balloon.y, ringR, ringR);
            }
            noStroke();

            // 繪製主體
            fill(red(balloon.col), green(balloon.col), blue(balloon.col), currAlpha);
            ellipse(balloon.x, balloon.y, currR * 0.7, currR * 0.7);

            balloon.timer++;
            
            // 爆破動畫結束
            if (balloon.timer > maxT) {
                if (isGameActive) {
                    score++; // 點擊爆炸後，在此處加一分
                }
                // 重設氣球
                poppingBalloons[i] = createExplosionBalloon();
            }
        }
    }
}