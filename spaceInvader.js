
spaceInvader(window, document.getElementById('space-invader'));
window.focus();

function spaceInvader (window, canvas) {

    var context = canvas.getContext('2d');

    class Pos {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

        clone() {
            return new Pos(this.x, this.y);
        }

        move(x, y) {
            this.x += x;
            this.y += y;
            return this;
        }

        add(pos) {
            this.move(pos.x, pos.y);
            return this;
        }
    }

    class Game {
        constructor() {
            this.message = '';
            this.rebel = [];
            this.republic = [];
            this.other = [];
            this.size = new Pos(canvas.width, canvas.height);
            this.wave = 0;

            this.refresh = function () {
                this.update();
                this.draw();
                requestAnimationFrame(this.refresh);
            }.bind(this);

            this.init();
        }

        init () {
            this.ship = new Ship(this);
            this.addRebel(this.ship);
            this.refresh();
        }

        update () {
            this.handleCollisions();
            this.computeElements();
            this.elements.forEach(Element.update);
            if (!this.rebel.length) {
                this.showText('SLM beat you!!!', true);
                return;
            }
            if (!this.republic.length) this.createWave();
        }

        draw () {
            context.clearRect(0, 0, this.size.x, this.size.y);
            this.elements.forEach(Element.draw);
            Alien.drawLife(this.republic);
            if (this.message) {
                context.save();
                context.font = '30px Arial black';
                context.textAlign='center';
                context.fillStyle = 'black';
                context.fillText(this.message, canvas.width / 2, canvas.height / 2);
                context.restore();
            }
        }

        computeElements () {
            this.elements = this.other.concat(this.republic, this.rebel);
        }

        addRebel (element) {
            this.rebel.push(element);
        }

        addRepublic (element) {
            this.republic.push(element);
        }

        addOther (element) {
            this.other.push(element);
        }

        handleCollisions () {
            this.rebel.forEach(function(elementA) {
                this.republic.forEach(function (elementB) {
                    if (!Element.colliding(elementA, elementB)) return;
                    elementA.life--;
                    elementB.life--;
                    var sizeA = elementA.size.x * elementA.size.y;
                    var sizeB = elementB.size.x * elementB.size.y;
                    this.addOther(new Explosion(this, sizeA > sizeB ? elementA.pos.clone() : elementB.pos.clone()));
                }, this);
            }, this);
            this.republic = this.republic.filter(Element.isAlive);
            this.rebel = this.rebel.filter(Element.isAlive);
            this.other = this.other.filter(Element.isAlive);
            this.republic = this.republic.filter(this.elementInGame, this);
            this.rebel = this.rebel.filter(this.elementInGame, this);
        }

        elementInGame (element) {
            return !(element instanceof Bullet) || (
                element.pos.x + element.halfWidth > 0 &&
                element.pos.x - element.halfWidth < this.size.x &&
                element.pos.y + element.halfHeight > 0 &&
                element.pos.y - element.halfHeight < this.size.x
            );
        }

        createWave () {
            this.ship.life = Ship.MAX_LIFE;
            this.ship.fireRate = Math.max(50, Ship.FIRE_RATE - 50 * this.wave);
            this.wave++;
            this.showText('Season: ' + this.wave);
            var waveSpeed = Math.ceil(this.wave / 2);
            var waveProb = (999 - this.wave * 2) / 1000;
            var margin = Alien.SIZE.clone().move(10, 10);
            for (var i = 0; i < 24; i++) {
                var x = margin.x + (i % 8) * margin.x;
                var y = -200 + (i % 3) * margin.y;
                this.addRepublic(new Alien(this, new Pos(x, y), waveSpeed, waveProb));
            }
        }

        showText (message, final) {
            this.message = message;
            if (!final) setTimeout(this.showText.bind(this, '', true), Game.MESSAGE_DURATION);
        }
    }
    Game.MESSAGE_DURATION = 1500;

    class Element {
        constructor(game, pos, size) {
            this.game = game;
            this.pos = pos;
            this.size = size;
            this.halfWidth = Math.floor(this.size.x / 2);
            this.halfHeight = Math.floor(this.size.y / 2);
        }

        static update (element) {
            element.update();
        }

        static draw (element) {
            element.draw();
        }

        static isAlive (element) {
            return element.life > 0;
        }

        static colliding (elementA, elementB) {
            return !(
                elementA === elementB ||
                elementA.pos.x + elementA.halfWidth < elementB.pos.x - elementB.halfWidth ||
                elementA.pos.y + elementA.halfHeight < elementB.pos.y - elementB.halfHeight ||
                elementA.pos.x - elementA.halfWidth > elementB.pos.x + elementB.halfWidth ||
                elementA.pos.y - elementA.halfHeight > elementB.pos.y + elementB.halfHeight
            );
        }
    }

    class Ship extends Element {
        constructor(game) {
            var pos = new Pos(
                Math.floor(game.size.x / 2) - Math.floor(Ship.SIZE.x / 2),
                game.size.y - Math.floor(Ship.SIZE.y / 2)
            );
            super(game, pos, Ship.SIZE);
            this.kb = new KeyBoard();
            this.speed = Ship.SPEED;
            this.allowShooting = true;
            this.life = Ship.MAX_LIFE;
            this.fireRate = Ship.FIRE_RATE;
        }

        update () {
            if (this.kb.isDown(KeyBoard.KEYS.LEFT) && this.pos.x - this.halfWidth > 0) {
                this.pos.move(-this.speed, 0);
            }
            else if (this.kb.isDown(KeyBoard.KEYS.RIGHT) && this.pos.x + this.halfWidth < this.game.size.x) {
                this.pos.move(this.speed, 0);
            }
            if (this.allowShooting && this.kb.isDown(KeyBoard.KEYS.SPACE)) {
                var bullet = new Bullet(
                    this.game,
                    this.pos.clone().move(0, -this.halfHeight),
                    new Pos(0, -Bullet.SPEED),
                    true
                );
                this.game.addRebel(bullet);
                this.toogleShooting();
            }
        }

        draw () {
            context.save();
            context.translate(this.pos.x - this.halfWidth, this.pos.y - this.halfHeight);
            context.drawImage(Image('ship'), 0, 0);
            context.restore();
            this.drawLife();
        }

        drawLife () {
            context.save();
            context.fillStyle = '#F95738';
            context.fillRect(this.game.size.x -112, 10, 102, 12);
            context.fillStyle = '#1CB5E7';
            context.fillRect(this.game.size.x -111, 11, this.life * 100 / Ship.MAX_LIFE, 10);
            context.restore();
        }

        toogleShooting (final) {
            this.allowShooting = !this.allowShooting;
            if (!final) setTimeout(this.toogleShooting.bind(this, true), this.fireRate);
        }
    }
    Ship.SIZE = new Pos(67, 53);
    Ship.SPEED = 8;
    Ship.MAX_LIFE = 5;
    Ship.FIRE_RATE = 200;

    class Alien extends Element {
        constructor(game, pos, speed, shootProb) {
            super(game, pos, Alien.SIZE);
            this.speed = speed;
            this.shootProb = shootProb;
            this.life = 3;
            this.direction = new Pos(1, 1);
        }

        update () {
            if (this.pos.x - this.halfWidth <= 0) {
                this.direction.x = 1;
            } else if (this.pos.x + this.halfWidth >= this.game.size.x) {
                this.direction.x = -1;
            } else if (Math.random() > Alien.CHDIR_PRO) {
                this.direction.x = -this.direction.x;
            }
            if (this.pos.y - this.halfHeight <= 0) {
                this.direction.y = 1;
            } else if (this.pos.y + this.halfHeight >= Alien.MAX_RANGE) {
                this.direction.y = -1;
            } else if (Math.random() > Alien.CHDIR_PRO) {
                this.direction.y = -this.direction.y;
            }
            this.pos.x += this.speed * this.direction.x;
            this.pos.y += this.speed * this.direction.y;

            if (Math.random() > this.shootProb) {
                var bullet = new Bullet(
                    this.game,
                    this.pos.clone().move(0, this.halfHeight),
                    new Pos(Math.random() - 0.5, Bullet.SPEED),
                    false
                );
                this.game.addRepublic(bullet);
          }
        }

        draw () {
            context.save();
            context.translate(this.pos.x + this.halfWidth, this.pos.y + this.halfHeight);
            context.rotate(Math.PI);
            context.drawImage(Image('fighter'), 0, 0);
            context.restore();
        }

        static drawLife (array) {
            array = array.filter(x => x instanceof Alien);
            context.save();
            context.fillStyle = '#1CB5E7';
            context.fillRect(10, 10, 10 * array.length + 2, 12);
            array.forEach(function (alien, idx) {
                switch (alien.life) {
                    case 3:
                        context.fillStyle = '#539A20';
                        break;
                    case 2:
                        context.fillStyle = '#F69417';
                        break;
                    case 1:
                        context.fillStyle = '#F95738';
                        break;
                }
                context.fillRect(10 * idx + 11, 11, 10, 10);
            });
            context.restore();
        }
    }
    Alien.SIZE = new Pos(50, 56);
    Alien.MAX_RANGE = 350;
    Alien.CHDIR_PRO = 0.990;

    class Bullet extends Element {
        constructor(game, pos, direction, isRebel) {
            super(game, pos, Bullet.SIZE);
            this.direction = direction;
            this.isRebel = isRebel;
            this.life = 1;
            Sound('sound-raygun');
        }

        update () {
            this.pos.add(this.direction);
        }

        draw () {
            context.save();
            var img;
            if (this.isRebel) {
                context.translate(this.pos.x - this.halfWidth, this.pos.y - this.halfHeight);
                img = Image('rebel-bullet');
            }
            else {
                context.translate(this.pos.x + this.halfWidth, this.pos.y + this.halfHeight);
                img = Image('republic-bullet');
                context.rotate(Math.PI);
            }
            context.drawImage(img, 0, 0);
            context.restore();
        }
    }
    Bullet.SIZE = new Pos(15, 16);
    Bullet.SPEED = 3;

    class Explosion extends Element {
        constructor(game, pos) {
            super(game, pos, Explosion.SIZE);
            this.life = 1;
            this.date = new Date();
            Sound('sound-explosion');
        }

        update () {
            if (new Date() - this.date > Explosion.DURATION) this.life = 0;
        }

        draw () {
            context.save();
            context.translate(this.pos.x - this.halfWidth, this.pos.y - this.halfHeight);
            context.drawImage(Image('explosion'), 0, 0);
            context.restore();
        };
    }
    Explosion.SIZE = new Pos(115, 100);
    Explosion.DURATION = 150;

    class KeyBoard {
        constructor() {
            this.state = {};
            window.addEventListener('keydown', e => this.state[e.keyCode] = true);
            window.addEventListener('keyup', e => this.state[e.keyCode] = false);
        }

        isDown (key) {
            return this.state[key];
        }
    }
    KeyBoard.KEYS = {
        LEFT: 37,
        RIGHT: 39,
        SPACE: 32
    };

    function Ressource(name) {
        if (!Ressource.cache[name]) Ressource.cache[name] = document.getElementById(name);
        return Ressource.cache[name];
    }
    Ressource.cache = {};

    function Image (name) {
        return Ressource(name);
    }

    function Sound (name) {
        try {
            var sound = Ressource(name);
            sound.load();
            sound.play().then(() => {}, () => {});
        }
        catch (e) {
            // only a sound issue
        }
    }

    window.addEventListener('load', function() {
        new Game();
    });
}
