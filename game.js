const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');

const tralaleroImg = document.getElementById('tralalero-img');
const bombardiloImg = document.getElementById('bombardilo-img');
const sahurImg = document.getElementById('sahur-img');

const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 80;
const BALL_RADIUS = 11;
const PLAYER_X = 20;
const AI_X = canvas.width - PADDLE_WIDTH - 20;
const PADDLE_SPEED = 6;

// Score
let scoreLeft = 0;
let scoreRight = 0;

// Ball base speed reduced to 1/5
const BASE_BALL_SPEED_X = 1.2;
const BASE_BALL_SPEED_Y = 0.8;

// Game state
let playerY = (canvas.height - PADDLE_HEIGHT) / 2;
let aiY = (canvas.height - PADDLE_HEIGHT) / 2;
let ballX = canvas.width / 2;
let ballY = canvas.height / 2;
let ballSpeedX = BASE_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1);
let ballSpeedY = BASE_BALL_SPEED_Y * (Math.random() * 2 - 1);

// Skill state
let skill = null;
let skillTimer = 0;
let skillAnimation = 0;
let skillActive = false;

// Tralalero skill (wave effect & force ball toward opponent)
let tralaleroWaveActive = false;
let tralaleroWavePhase = 0;
let tralaleroOriginalSpeed = {x: 0, y: 0};

// Sahur skill (horror effect and destroy game permanently)
let sahurDestroyed = false;
let sahurEffectTimer = 0;

// Utility
function updateScore() {
    document.getElementById('score-left').innerText = scoreLeft;
    document.getElementById('score-right').innerText = scoreRight;
}

function resetBall(direction = 0) {
    ballX = canvas.width / 2;
    ballY = canvas.height / 2;
    if (direction === 0) {
        ballSpeedX = BASE_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1);
    } else {
        ballSpeedX = BASE_BALL_SPEED_X * direction;
    }
    ballSpeedY = BASE_BALL_SPEED_Y * (Math.random() * 2 - 1);
}

function resetGame() {
    playerY = (canvas.height - PADDLE_HEIGHT) / 2;
    aiY = (canvas.height - PADDLE_HEIGHT) / 2;
    resetBall();
    tralaleroWaveActive = false;
    skill = null;
    skillActive = false;
    skillAnimation = 0;
    skillTimer = 0;
    sahurDestroyed = false;
    sahurEffectTimer = 0;
    updateScore();
}

canvas.addEventListener('mousemove', e => {
    if (sahurDestroyed) return;
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    playerY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, mouseY - PADDLE_HEIGHT / 2));
});

function drawRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
}

function drawNet() {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, y);
        ctx.lineTo(canvas.width / 2, y + 18);
        ctx.stroke();
    }
}

function awardPoint(isLeft) {
    if (isLeft) {
        scoreLeft++;
    } else {
        scoreRight++;
    }
    updateScore();
}

function updateAI() {
    if (sahurDestroyed) return;
    let ballFollowY = ballY;
    const aiCenter = aiY + PADDLE_HEIGHT / 2;
    if (aiCenter < ballFollowY - 20) {
        aiY += PADDLE_SPEED * 0.7;
    } else if (aiCenter > ballFollowY + 20) {
        aiY -= PADDLE_SPEED * 0.7;
    }
    aiY = Math.max(0, Math.min(canvas.height - PADDLE_HEIGHT, aiY));
}

// Ball physics (base or special)
function updateBall() {
    if (sahurDestroyed) return;

    // Tralalero wave skill - random direction toward opponent
    if (tralaleroWaveActive) {
        tralaleroWavePhase += 0.21;
        // Send ball in random direction toward opponent
        let speed = 7.5 + 1.8 * Math.sin(tralaleroWavePhase/2);
        let randomDirection = Math.random() > 0.5 ? 1 : -1;
        ballSpeedX = speed * randomDirection;
        // Wave effect makes ball oscillate vertically
        ballSpeedY = Math.sin(tralaleroWavePhase) * 6.2 + Math.cos(tralaleroWavePhase * 0.7) * 3.8;
    }

    ballX += ballSpeedX;
    ballY += ballSpeedY;

    if (ballY - BALL_RADIUS < 0) {
        ballY = BALL_RADIUS;
        ballSpeedY = -ballSpeedY;
    }
    if (ballY + BALL_RADIUS > canvas.height) {
        ballY = canvas.height - BALL_RADIUS;
        ballSpeedY = -ballSpeedY;
    }
    // Left paddle collision
    if (
        ballX - BALL_RADIUS < PLAYER_X + PADDLE_WIDTH &&
        ballY + BALL_RADIUS > playerY &&
        ballY - BALL_RADIUS < playerY + PADDLE_HEIGHT &&
        ballX - BALL_RADIUS > PLAYER_X
    ) {
        ballX = PLAYER_X + PADDLE_WIDTH + BALL_RADIUS;
        ballSpeedX = Math.abs(ballSpeedX);
        let collidePoint = (ballY - (playerY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        ballSpeedY = collidePoint * 2.5;
        if (tralaleroWaveActive) tralaleroWavePhase += 0.28; // wave phase jump
    }
    // Right paddle collision
    if (
        ballX + BALL_RADIUS > AI_X &&
        ballY + BALL_RADIUS > aiY &&
        ballY - BALL_RADIUS < aiY + PADDLE_HEIGHT &&
        ballX + BALL_RADIUS < AI_X + PADDLE_WIDTH * 2
    ) {
        ballX = AI_X - BALL_RADIUS;
        ballSpeedX = -Math.abs(ballSpeedX);
        let collidePoint = (ballY - (aiY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        ballSpeedY = collidePoint * 2.5;
        if (tralaleroWaveActive) tralaleroWavePhase += 0.31;
    }
    // Score right
    if (ballX - BALL_RADIUS < 0) {
        awardPoint(false);
        if (tralaleroWaveActive) {
            tralaleroWaveActive = false;
            ballSpeedX = BASE_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1);
            ballSpeedY = BASE_BALL_SPEED_Y * (Math.random() * 2 - 1);
        }
        resetBall(1);
    }
    // Score left
    if (ballX + BALL_RADIUS > canvas.width) {
        awardPoint(true);
        if (tralaleroWaveActive) {
            tralaleroWaveActive = false;
            ballSpeedX = BASE_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1);
            ballSpeedY = BASE_BALL_SPEED_Y * (Math.random() * 2 - 1);
        }
        resetBall(-1);
    }
}

// Bombardilo effect
function drawBombardiloEffect() {
    let skyGrad = ctx.createLinearGradient(0,0,0,canvas.height);
    skyGrad.addColorStop(0, "#87ceeb");
    skyGrad.addColorStop(0.5, "#fffbe7");
    skyGrad.addColorStop(1, "#aac8e7");
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.globalAlpha = 1;

    // Enhanced clouds with dynamic movement
    for(let i=0; i<15; i++) {
        let cx = (i*65 + skillAnimation*8 + Math.sin(skillAnimation/15 + i)*20)%canvas.width;
        let cy = 50 + Math.sin(skillAnimation/6 + i)*18 + i*5 + Math.cos(skillAnimation/12 + i*0.3)*8;
        ctx.save();
        ctx.globalAlpha = 0.12 + (i%4)*0.08 + 0.03*Math.sin(skillAnimation/10 + i);
        ctx.beginPath();
        let cloudW = 55 + (i%4)*18 + 8*Math.sin(skillAnimation/20 + i);
        let cloudH = 25 + (i%3)*7 + 4*Math.cos(skillAnimation/18 + i);
        ctx.ellipse(cx, cy, cloudW, cloudH, Math.sin(skillAnimation/25 + i)*0.2, 0, 2*Math.PI);
        ctx.fillStyle = i%5 === 0 ? "#fff" : "#f0f8ff";
        ctx.fill();
        ctx.restore();
    }
    if((skillAnimation%60)>46) {
        ctx.save();
        ctx.globalAlpha = 0.32 + Math.random()*0.18;
        ctx.fillStyle = "#ffffcf";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.restore();
    }
    let planeX = -220 + skillAnimation*8;
    let planeY = 110 + Math.sin(skillAnimation/8)*10;
    ctx.save();
    ctx.translate(planeX, planeY);
    ctx.rotate(Math.sin(skillAnimation/20)*0.04);
    ctx.drawImage(bombardiloImg, 0, 0, 340, 200);
    ctx.restore();

    let numBombs = 7;
    for(let b=0; b<numBombs; b++) {
        let bombX = planeX + 170 + b*24;
        let bombY = planeY + 130 + Math.max(0, (skillAnimation-18-b*4)*9);
        if(skillAnimation>22+b*3) {
            ctx.save();
            ctx.translate(bombX, bombY);
            ctx.rotate(Math.PI/14*skillAnimation);
            ctx.fillStyle="#222";
            ctx.beginPath();
            ctx.arc(0,0,19,0,2*Math.PI);
            ctx.fill();
            ctx.restore();
        }
        if(skillAnimation>42+b*4) {
            let boomR = Math.min(400, (skillAnimation-42-b*4)*15);
            ctx.globalAlpha = 0.92 - b*0.08;
            let grad = ctx.createRadialGradient(canvas.width-130-b*40, canvas.height-80-b*22, 28, canvas.width-130-b*40, canvas.height-80-b*22, boomR);
            grad.addColorStop(0, "#fffbe7");
            grad.addColorStop(0.13, "#ffe157");
            grad.addColorStop(0.3, "#ff5d00");
            grad.addColorStop(0.6, "#c00800");
            grad.addColorStop(1, "#000");
            ctx.beginPath();
            ctx.arc(canvas.width-130-b*40, canvas.height-80-b*22, boomR, 0, 2*Math.PI);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
    if(skillAnimation>70) {
        for(let p=0; p<36; p++) {
            let angle = Math.random()*Math.PI*2;
            let dist = (skillAnimation-70)*8 * Math.random();
            let px = canvas.width-180 + Math.cos(angle)*dist;
            let py = canvas.height-100 + Math.sin(angle)*dist;
            ctx.beginPath();
            ctx.arc(px, py, 7 + Math.random()*6, 0, 2*Math.PI);
            ctx.fillStyle = `rgba(255,${Math.floor(120+Math.random()*110)},0,${Math.random()*0.5})`;
            ctx.fill();
        }
    }
    ctx.font = "bold 72px Impact";
    ctx.textAlign = "center";
    ctx.shadowColor = "#ffed44";
    ctx.shadowBlur = 58 + 15*Math.sin(skillAnimation/8);
    ctx.fillStyle = "#ff2e00";
    ctx.globalAlpha = 0.99;
    let titleY = canvas.height/2-70 + 8*Math.sin(skillAnimation/6);
    ctx.fillText("BOMBARDIRO CROCODILO!!", titleY < canvas.width/2 ? canvas.width/2 : titleY, canvas.height/2-70);
    
    ctx.font = "bold 42px 'Arial Black', Arial";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#ff5500";
    ctx.shadowBlur = 20 + 10*Math.cos(skillAnimation/5);
    ctx.globalAlpha = 0.95 + 0.05*Math.sin(skillAnimation/4);
    ctx.fillText("Opponent's score becomes ZERO!", canvas.width/2, canvas.height/2-17);
    ctx.globalAlpha = 1;
}

function drawTralaleroWaveEffect() {
    // Wave themed background and water splash
    ctx.save();
    ctx.globalAlpha = 0.32;
    let grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0.0, "#78e0ff");
    grad.addColorStop(0.5 + 0.2*Math.sin(skillAnimation/30), "#0080ff");
    grad.addColorStop(1.0, "#fff");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;

    // Enhanced wave lines with multiple layers
    for (let i=0; i<8; i++) {
        ctx.beginPath();
        for (let x=0; x<canvas.width; x+=8) {
            let y = 160 + 35*i + Math.sin(skillAnimation/9 + x/60 + i)*25 + Math.sin(x/40 - skillAnimation/7)*12 + Math.cos(x/80 + skillAnimation/5)*8;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsl(${180+i*25 + Math.sin(skillAnimation/20)*30},100%,${65+i*3}%)`;
        ctx.lineWidth = 3+i*0.8 + Math.sin(skillAnimation/15)*2;
        ctx.globalAlpha = 0.15 + 0.08*i + 0.05*Math.sin(skillAnimation/12);
        ctx.stroke();
    }
    
    // Add sparkling water particles
    for(let p=0; p<25; p++) {
        let particleX = (skillAnimation*3 + p*30) % canvas.width;
        let particleY = 200 + Math.sin(skillAnimation/8 + p)*120 + Math.cos(particleX/50)*40;
        ctx.beginPath();
        let particleRadius = Math.max(1, 2 + Math.sin(skillAnimation/6 + p)*1.5);
        ctx.arc(particleX, particleY, particleRadius, 0, 2*Math.PI);
        ctx.fillStyle = `hsla(${190 + Math.sin(p + skillAnimation/10)*60}, 100%, 85%, ${0.4 + 0.3*Math.sin(skillAnimation/7 + p)})`;
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Dynamic text effects
    ctx.font = "bold 64px 'Comic Sans MS', Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = "#1aeaff";
    ctx.shadowBlur = 40 + 20*Math.sin(skillAnimation/6);
    
    // Multi-colored gradient text
    let gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, "#1aeaff");
    gradient.addColorStop(0.3, "#00ffff");
    gradient.addColorStop(0.6, "#4dfaff");
    gradient.addColorStop(1, "#87ceeb");
    ctx.fillStyle = gradient;
    
    let textY = 100 + 15*Math.sin(skillAnimation/4) + 5*Math.cos(skillAnimation/3);
    ctx.globalAlpha = 0.9 + 0.1*Math.sin(skillAnimation/5);
    ctx.fillText("TRALALERO TRALALA!", canvas.width/2, textY);
    
    ctx.font = "bold 36px 'Arial', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#0080ff";
    ctx.shadowBlur = 25;
    ctx.fillText("Wave pushes the ball wildly!", canvas.width/2, textY + 50);
    ctx.restore();
}


function drawSahurHorrorEffect() {
    // 검은 화면 + 붉은 안개 + 사후르 이미지 + 깜박이는 효과와 GAME DESTROYED 메시지(8초 후에도 영원히)
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = "#000";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // 붉은 안개
    for(let i=0;i<8;i++){
        ctx.globalAlpha = 0.07 + 0.06*Math.sin(skillAnimation/5+i);
        ctx.beginPath();
        ctx.arc(
            canvas.width/2 + Math.sin(skillAnimation/13+i)*130,
            canvas.height/2 + Math.cos(skillAnimation/6+i)*90,
            220-(i*20)+Math.sin(skillAnimation/4+i)*12,
            0,2*Math.PI);
        ctx.fillStyle = `hsl(${(skillAnimation*8+i*30)%360},88%,36%)`;
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    // 이미지
    ctx.save();
    let charW = 300, charH = 340;
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(Math.sin(skillAnimation/10)*0.04);
    ctx.drawImage(sahurImg, -charW/2, -charH/2, charW, charH);
    ctx.restore();

    // Horror text with enhanced effects
    ctx.font = "bold 68px 'Arial Black', Arial";
    ctx.textAlign = "center";
    ctx.shadowColor = skillAnimation%24<12 ? "#ff0000" : "#fff";
    ctx.shadowBlur = 60 + 35*Math.abs(Math.sin(skillAnimation/7));
    
    // Glitchy text effect
    let glitchOffset = skillAnimation%16<8 ? Math.random()*6-3 : 0;
    ctx.fillStyle = skillAnimation%32<16 ? "#fff" : "#ff0000";
    ctx.globalAlpha = 0.94 + 0.05*Math.sin(skillAnimation/8);
    ctx.fillText("GAME DESTROYED!", canvas.width/2 + glitchOffset, canvas.height/2+charH/2+38);
    
    // Secondary glitch layer
    if(skillAnimation%48<24) {
        ctx.fillStyle = "#ff0000";
        ctx.globalAlpha = 0.3;
        ctx.fillText("GAME DESTROYED!", canvas.width/2 - glitchOffset, canvas.height/2+charH/2+40);
    }
    
    ctx.font = "bold 42px 'Arial Black', Arial";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 15 + 8*Math.sin(skillAnimation/9);
    ctx.fillStyle = "#fff";
    ctx.globalAlpha = 0.76 + 0.2*Math.cos(skillAnimation/11);
    let sahurY = canvas.height/2+charH/2+85 + 3*Math.sin(skillAnimation/13);
    ctx.fillText("TUNG TUNG TUNG TUNG TUNG TUNG TUNG TUNG TUNG SAHUR", canvas.width/2, sahurY);
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (sahurDestroyed) {
        drawSahurHorrorEffect();
        return;
    }

    if (tralaleroWaveActive) {
        drawTralaleroWaveEffect();
    }

    if (skill === "bombardilo") {
        drawBombardiloEffect();
    }

    if (!tralaleroWaveActive && skill !== "bombardilo") {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (!tralaleroWaveActive && skill !== "bombardilo") {
        drawNet();
        drawRect(PLAYER_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, "#00ff99");
        drawRect(AI_X, aiY, PADDLE_WIDTH, PADDLE_HEIGHT, "#ff0055");
        drawCircle(ballX, ballY, BALL_RADIUS, "#fff");
    } else {
        // 파도나 폭격중엔 공/패들/네트 위에 그리기
        drawNet();
        drawRect(PLAYER_X, playerY, PADDLE_WIDTH, PADDLE_HEIGHT, "#00ff99");
        drawRect(AI_X, aiY, PADDLE_WIDTH, PADDLE_HEIGHT, "#ff0055");
        // 공은 파도에 흔들림 적용
        if (tralaleroWaveActive) {
            ctx.save();
            ctx.translate(0, Math.sin(tralaleroWavePhase)*6);
            drawCircle(ballX, ballY, BALL_RADIUS + 10, "#1aeaff");
            ctx.globalAlpha = 0.6;
            ctx.drawImage(tralaleroImg, ballX-(BALL_RADIUS+13), ballY-(BALL_RADIUS+13), (BALL_RADIUS+13)*2, (BALL_RADIUS+13)*2);
            ctx.globalAlpha = 1.0;
            ctx.restore();
        } else {
            drawCircle(ballX, ballY, BALL_RADIUS, "#fff");
        }
    }
}

function gameLoop() {
    if (sahurDestroyed) {
        // 영원히 호러/파괴 화면만 유지 + 점수 계속 미친듯이 변화
        skillAnimation++;
        if(skillAnimation % 2 === 0) { // 2프레임마다 점수 변경으로 더 빠르게
            scoreLeft = Math.floor(Math.random() * 1999999) - 999999;
            scoreRight = Math.floor(Math.random() * 1999999) - 999999;
            updateScore();
        }
        draw();
        requestAnimationFrame(gameLoop);
        return;
    }
    if(skill) {
        skillTimer--;
        skillAnimation++;
        skillActive = true;

        // 봄바르딜로: 점수 0으로 (오른쪽)
        if(skill === "bombardilo" && skillAnimation === 100) {
            scoreRight = 0;
            updateScore();
        }
        if(skill === "bombardilo" && skillAnimation > 330) {
            resetGame();
            skill = null;
            skillAnimation = 0;
            skillActive = false;
        }

        // 트랄렐레오: 파도 효과 5초(300프레임)
        if(skill === "tralalero" && skillAnimation === 1) {
            tralaleroWaveActive = true;
            tralaleroWavePhase = 0;
        }
        if(skill === "tralalero" && skillAnimation > 300) {
            tralaleroWaveActive = false;
            skill = null;
            skillAnimation = 0;
            skillActive = false;
            ballSpeedX = BASE_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1);
            ballSpeedY = BASE_BALL_SPEED_Y * (Math.random() * 2 - 1);
        }

        // 사후르: 8초간 호러 + 점수 미친듯이 변화, 이후 영구 파괴
        if(skill === "sahur" && skillAnimation === 1) {
            sahurEffectTimer = 0;
        }
        if(skill === "sahur") {
            // 점수가 미친듯이 랜덤하게 변화 (매 프레임마다)
            if(skillAnimation % 3 === 0) { // 3프레임마다 변경하여 너무 빠르지 않게
                scoreLeft = Math.floor(Math.random() * 1999999) - 999999; // -999999 ~ 999999
                scoreRight = Math.floor(Math.random() * 1999999) - 999999;
                updateScore();
            }
        }
        if(skill === "sahur" && skillAnimation >= 480) { // 60fps x 8초 = 480
            sahurDestroyed = true;
            skill = null;
            skillActive = false;
            skillAnimation = 0;
        }

        if(tralaleroWaveActive) updateBall();
        draw();
        requestAnimationFrame(gameLoop);
        return;
    }
    skillActive = false;
    updateAI();
    updateBall();
    draw();
    requestAnimationFrame(gameLoop);
}

function useSkill(type) {
    if(skillActive || sahurDestroyed) return;
    skill = type;
    skillTimer = 2000;
    skillAnimation = 0;
    if(type === "tralalero") {
        tralaleroWaveActive = false;
        tralaleroWavePhase = 0;
    }
    if(type === "sahur") {
        sahurEffectTimer = 0;
    }
}

resetGame();
gameLoop();
window.useSkill = useSkill;