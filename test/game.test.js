/**
 * @file game.test.js — 2048 游戏核心逻辑测试
 * 
 * 运行方式（Node.js 环境，需要 jsdom）：
 *   npm install --save-dev jsdom mocha chai
 *   npx mocha test/game.test.js
 */

// ============ 模拟浏览器环境 ============
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!DOCTYPE html>
<html><body>
    <div id="score">0</div>
    <div id="best">0</div>
    <div id="board"></div>
    <div id="message"></div>
    <button id="size-3"></button>
    <button id="size-4"></button>
    <button id="size-5"></button>
</body></html>`, { url: 'http://localhost' });

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;

// 加载游戏逻辑
require('../src/game.js');
const game = window.game;

const { expect } = require('chai');

// ============ 测试用例 ============
describe('2048 游戏核心逻辑', function () {

    beforeEach(function () {
        localStorage.clear();
        game.initBoard(4);
    });

    // ---- 初始化 ----
    describe('initBoard()', function () {
        it('应创建4x4棋盘', function () {
            const b = game.board;
            expect(b).to.have.lengthOf(4);
            b.forEach(row => expect(row).to.have.lengthOf(4));
        });

        it('初始应有恰好2个非零方块', function () {
            let count = 0;
            game.board.forEach(row => row.forEach(v => { if (v !== 0) count++; }));
            expect(count).to.equal(2);
        });

        it('初始分数应为0', function () {
            expect(game.getScore()).to.equal(0);
        });
    });

    // ---- slideRow ----
    describe('slideRow()', function () {
        it('应合并相同相邻数字', function () {
            // [2,2,0,0] → [4,0,0,0]
            const result = game.slideRow([2, 2, 0, 0]);
            expect(result[0]).to.equal(4);
            expect(result.slice(1).every(v => v === 0)).to.be.true;
        });

        it('应忽略被合并过的数字', function () {
            // [2,2,2,0] → [4,2,0,0]（不能 [2,4,0,0]）
            const result = game.slideRow([2, 2, 2, 0]);
            expect(result[0]).to.equal(4);
            expect(result[1]).to.equal(2);
        });

        it('应正确滑动非相邻数字', function () {
            // [0,2,0,2] → [4,0,0,0]
            const result = game.slideRow([0, 2, 0, 2]);
            expect(result[0]).to.equal(4);
            expect(result.slice(1).every(v => v === 0)).to.be.true;
        });

        it('全零行应保持不变', function () {
            const result = game.slideRow([0, 0, 0, 0]);
            expect(result.every(v => v === 0)).to.be.true;
        });
    });

    // ---- 移动 ----
    describe('moveLeft()', function () {
        it('应正确左移并返回true', function () {
            game.board[0] = [0, 0, 2, 2];
            const moved = game.moveLeft();
            expect(moved).to.be.true;
            expect(game.board[0]).to.deep.equal([4, 0, 0, 0]);
        });

        it('无法移动时应返回false', function () {
            game.board[0] = [2, 4, 8, 16];
            game.board[1] = [4, 8, 16, 32];
            game.board[2] = [8, 16, 32, 64];
            game.board[3] = [16, 32, 64, 128];
            const moved = game.moveUp();
            expect(moved).to.be.false;
        });
    });

    // ---- 胜负判定 ----
    describe('checkWin()', function () {
        it('到达2048应判定胜利', function () {
            game.board[0][0] = 2048;
            expect(game.checkWin()).to.be.true;
        });

        it('没有2048不应判定胜利', function () {
            expect(game.checkWin()).to.be.false;
        });
    });

    describe('checkLose()', function () {
        it('有空格不应判定失败', function () {
            expect(game.checkLose()).to.be.false;
        });

        it('满盘且无法合并应判定失败', function () {
            game.board = [
                [2, 4, 8, 16],
                [4, 8, 16, 32],
                [8, 16, 32, 64],
                [16, 32, 64, 128]
            ];
            expect(game.checkLose()).to.be.true;
        });
    });

    // ---- spawnTile ----
    describe('spawnTile()', function () {
        it('有空格时应生成方块', function () {
            const result = game.spawnTile();
            expect(result).to.be.true;
            let count = 0;
            game.board.forEach(row => row.forEach(v => { if (v !== 0) count++; }));
            expect(count).to.equal(3);
        });

        it('无空格时应返回false', function () {
            game.board = game.board.map(row => row.map(() => 2));
            const result = game.spawnTile();
            expect(result).to.be.false;
        });
    });

    // ---- 撤销 ----
    describe('undoMove()', function () {
        it('有快照时应成功撤销', function () {
            const oldBoard = game.board.map(r => [...r]);
            game.doMove('left');
            if (JSON.stringify(oldBoard) !== JSON.stringify(game.board)) {
                const result = game.undoMove();
                expect(result).to.be.true;
                expect(game.board).to.deep.equal(oldBoard);
            }
        });

        it('无快照时应返回false', function () {
            game.lastSnapshot = null;
            const result = game.undoMove();
            expect(result).to.be.false;
        });
    });

    // ---- 棋盘尺寸 ----
    describe('setBoardSize()', function () {
        it('3x3棋盘应正确创建', function () {
            game.setBoardSize(3);
            expect(game.getBoardSize()).to.equal(3);
            expect(game.board).to.have.lengthOf(3);
            game.board.forEach(row => expect(row).to.have.lengthOf(3));
        });

        it('5x5棋盘应正确创建', function () {
            game.setBoardSize(5);
            expect(game.getBoardSize()).to.equal(5);
            expect(game.board).to.have.lengthOf(5);
            game.board.forEach(row => expect(row).to.have.lengthOf(5));
        });
    });

});
